package com.shiguang.blog.ai;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiguang.blog.common.ApiException;
import com.shiguang.blog.entity.Post;
import com.shiguang.blog.mapper.PostMapper;
import com.shiguang.blog.mapper.RagChunkMapper;
import com.shiguang.blog.mapper.RagEntryMapper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * RAG 问答服务:检索范围 = 站内已发布文章 + 管理员维护的知识条目。
 * 收到问题后检索最相关的片段,再交给大模型生成回答;未配置大模型时自动降级。
 */
@Service
public class RAGService {
  private static final Pattern LATIN_WORD = Pattern.compile("[a-zA-Z0-9]{2,}");
  private static final int CHUNK_SIZE = 400;
  private static final int OVERLAP = 60;
  private static final int TOP_K = 6;

  private final PostMapper postMapper;
  private final RagChunkMapper chunkMapper;
  private final RagEntryMapper ragEntryMapper;
  private final LLMClient llmClient;
  private final ObjectMapper objectMapper;

  public RAGService(
      PostMapper postMapper,
      RagChunkMapper chunkMapper,
      RagEntryMapper ragEntryMapper,
      LLMClient llmClient,
      ObjectMapper objectMapper) {
    this.postMapper = postMapper;
    this.chunkMapper = chunkMapper;
    this.ragEntryMapper = ragEntryMapper;
    this.llmClient = llmClient;
    this.objectMapper = objectMapper;
  }

  /** 统一的检索单元:kind 为 post(站内文章)或 entry(知识条目)。 */
  private record ChunkItem(
      String kind, Long sourceId, String title, String content, String embedding) {}

  /** 建立/更新知识库索引:重建变化的部分,并补全缺失的知识条目向量。 */
  public void ensureIndexed() {
    List<Post> posts =
        postMapper.selectList(
            new LambdaQueryWrapper<Post>().eq(Post::getStatus, "approved"));
    List<Long> approvedIds = posts.stream().map(Post::getId).toList();
    if (approvedIds.isEmpty()) {
      chunkMapper.delete(new LambdaQueryWrapper<>());
    } else {
      chunkMapper.delete(
          new LambdaQueryWrapper<RagChunk>().notIn(RagChunk::getPost_id, approvedIds));
      for (Post post : posts) {
        Long lastIndexed =
            chunkMapper
                .selectList(
                    new LambdaQueryWrapper<RagChunk>()
                        .eq(RagChunk::getPost_id, post.getId())
                        .orderByDesc(RagChunk::getCreated_at)
                        .last("LIMIT 1"))
                .stream()
                .findFirst()
                .map(RagChunk::getCreated_at)
                .orElse(0L);
        if (post.getUpdated_at() != null && lastIndexed >= post.getUpdated_at()) {
          continue;
        }
        indexPost(post);
      }
    }

    List<RagEntry> entries =
        ragEntryMapper.selectList(
            new LambdaQueryWrapper<RagEntry>().orderByAsc(RagEntry::getId));
    for (RagEntry entry : entries) {
      Long embeddedAt = entry.getEmbedded_at() == null ? 0L : entry.getEmbedded_at();
      if (entry.getEmbedding() != null && embeddedAt >= entry.getUpdated_at()) {
        continue;
      }
      embedEntry(entry);
    }
  }

  private void indexPost(Post post) {
    chunkMapper.delete(
        new LambdaQueryWrapper<RagChunk>().eq(RagChunk::getPost_id, post.getId()));
    String tagLine =
        post.getTags() == null || post.getTags().isBlank()
            ? ""
            : "标签:" + post.getTags().replace("，", ",") + "\n";
    List<String> chunks = chunkText(post.getTitle() + "\n" + tagLine + post.getContent());
    boolean useEmbedding = llmClient.enabled();
    for (int i = 0; i < chunks.size(); i++) {
      RagChunk chunk = new RagChunk();
      chunk.setPost_id(post.getId());
      chunk.setChunk_index(i);
      chunk.setContent(chunks.get(i));
      chunk.setCreated_at(System.currentTimeMillis());
      if (useEmbedding) {
        try {
          chunk.setEmbedding(objectMapper.writeValueAsString(llmClient.embed(chunks.get(i))));
        } catch (Exception ignored) {
          // 向量化失败时该块只靠关键词检索
        }
      }
      chunkMapper.insert(chunk);
    }
  }

  private void embedEntry(RagEntry entry) {
    if (!llmClient.enabled()) {
      return;
    }
    try {
      entry.setEmbedding(
          objectMapper.writeValueAsString(
              llmClient.embed(entry.getTitle() + "\n" + entry.getContent())));
      entry.setEmbedded_at(System.currentTimeMillis());
      ragEntryMapper.updateById(entry);
    } catch (Exception ignored) {
      // 向量化失败,等待下次重试
    }
  }

  /** 处理用户问题:检索 + 生成回答 + 返回参考来源。 */
  public Map<String, Object> ask(String question) {
    ensureIndexed();
    List<ChunkItem> items = new ArrayList<>();
    for (RagChunk c :
        chunkMapper.selectList(
            new LambdaQueryWrapper<RagChunk>().orderByAsc(RagChunk::getId))) {
      items.add(new ChunkItem("post", c.getPost_id(), null, c.getContent(), c.getEmbedding()));
    }
    for (RagEntry e :
        ragEntryMapper.selectList(
            new LambdaQueryWrapper<RagEntry>().orderByAsc(RagEntry::getId))) {
      items.add(new ChunkItem("entry", e.getId(), e.getTitle(), e.getContent(), e.getEmbedding()));
    }
    if (items.isEmpty()) {
      return Map.of(
          "answer", "知识库还是空的,等有文章发布或管理员添加知识后再来问我吧。",
          "sources", List.of(),
          "llm", false);
    }

    float[] queryEmbedding = null;
    if (llmClient.enabled()) {
      try {
        queryEmbedding = llmClient.embed(question);
      } catch (Exception ignored) {
        queryEmbedding = null;
      }
    }

    List<Map.Entry<ChunkItem, Double>> scored = new ArrayList<>();
    for (ChunkItem item : items) {
      double keyword = keywordScore(question, item.content());
      double total = keyword;
      if (queryEmbedding != null && item.embedding() != null) {
        try {
          float[] vec = objectMapper.readValue(item.embedding(), float[].class);
          total = 0.7 * cosine(queryEmbedding, vec) + 0.3 * keyword;
        } catch (Exception ignored) {
          // 向量解析失败时退化为关键词得分
        }
      }
      scored.add(Map.entry(item, total));
    }
    scored.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
    List<ChunkItem> top =
        scored.stream().limit(TOP_K).map(Map.Entry::getKey).toList();

    List<Long> postIds =
        top.stream()
            .filter(i -> "post".equals(i.kind()))
            .map(ChunkItem::sourceId)
            .distinct()
            .toList();
    Map<Long, Post> posts =
        postIds.isEmpty()
            ? Map.of()
            : postMapper.selectBatchIds(postIds).stream()
                .collect(Collectors.toMap(Post::getId, Function.identity()));

    // 参考来源(去重,最多 5 条)
    List<Map<String, Object>> sources = new ArrayList<>();
    Set<Long> seenPosts = new LinkedHashSet<>();
    Set<Long> seenEntries = new LinkedHashSet<>();
    for (ChunkItem item : top) {
      if ("post".equals(item.kind())) {
        Post post = posts.get(item.sourceId());
        if (post == null || !seenPosts.add(post.getId())) continue;
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("post_id", post.getId());
        source.put("title", post.getTitle());
        source.put("slug", post.getSlug());
        source.put("excerpt", post.getExcerpt() == null ? "" : post.getExcerpt());
        sources.add(source);
      } else {
        if (!seenEntries.add(item.sourceId())) continue;
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("post_id", null);
        source.put("title", item.title());
        source.put("slug", null);
        source.put("excerpt", "");
        sources.add(source);
      }
      if (sources.size() >= 5) break;
    }

    StringBuilder context = new StringBuilder();
    for (ChunkItem item : top) {
      String title = "post".equals(item.kind()) ? posts.get(item.sourceId()).getTitle() : item.title();
      context.append("【文章:").append(title).append("】\n").append(item.content()).append("\n\n");
    }

    if (llmClient.enabled()) {
      try {
        List<Map<String, String>> messages =
            List.of(
                Map.of(
                    "role",
                    "system",
                    "content",
                    "你是“uswrite”博客社区的AI助手。请只根据下面提供的站内文章资料回答用户问题,"
                        + "不要编造资料中没有的信息;回答用中文,简洁有条理。"),
                Map.of(
                    "role",
                    "user",
                    "content",
                    "站内文章资料:\n" + context + "\n用户问题:" + question));
        String answer = llmClient.chat(messages);
        return Map.of("answer", answer, "sources", sources, "llm", true);
      } catch (Exception e) {
        // 大模型调用失败时走降级回答
      }
    }

    StringBuilder fallback = new StringBuilder("我根据站内文章找到了这些相关内容:\n\n");
    for (int i = 0; i < Math.min(3, top.size()); i++) {
      fallback.append("• ").append(truncate(top.get(i).content(), 160)).append("\n\n");
    }
    fallback.append("配置大模型 API Key 后,我就能基于这些内容给出智能回答。");
    return Map.of("answer", fallback.toString(), "sources", sources, "llm", false);
  }

  // ---------- 管理员:知识条目增删改查 ----------

  public List<RagEntry> listEntries() {
    return ragEntryMapper.selectList(
        new LambdaQueryWrapper<RagEntry>().orderByDesc(RagEntry::getUpdated_at));
  }

  public RagEntry createEntry(String title, String content) {
    long now = System.currentTimeMillis();
    RagEntry entry = new RagEntry();
    entry.setTitle(title.trim());
    entry.setContent(content.trim());
    entry.setEmbedded_at(0L);
    entry.setCreated_at(now);
    entry.setUpdated_at(now);
    ragEntryMapper.insert(entry);
    embedEntry(entry);
    return entry;
  }

  public RagEntry updateEntry(Long id, String title, String content) {
    RagEntry entry = ragEntryMapper.selectById(id);
    if (entry == null) {
      throw new ApiException(404, "知识条目不存在");
    }
    entry.setTitle(title.trim());
    entry.setContent(content.trim());
    entry.setEmbedding(null);
    entry.setEmbedded_at(0L);
    entry.setUpdated_at(System.currentTimeMillis());
    ragEntryMapper.updateById(entry);
    embedEntry(entry);
    return entry;
  }

  public void deleteEntry(Long id) {
    ragEntryMapper.deleteById(id);
  }

  private static List<String> chunkText(String text) {
    String[] paragraphs = text.split("\\r?\\n+");
    List<String> result = new ArrayList<>();
    StringBuilder buffer = new StringBuilder();
    for (String raw : paragraphs) {
      String paragraph = raw.trim();
      if (paragraph.isEmpty()) continue;
      if (buffer.length() + paragraph.length() > CHUNK_SIZE && buffer.length() > 0) {
        String finished = buffer.toString();
        result.add(finished);
        buffer.setLength(0);
        int overlap = Math.min(OVERLAP, finished.length());
        buffer.append(finished, finished.length() - overlap, finished.length());
      }
      buffer.append(paragraph).append("\n");
    }
    if (buffer.length() > 0) {
      result.add(buffer.toString());
    }
    return result;
  }

  private static double keywordScore(String query, String content) {
    String q = query.toLowerCase();
    String c = content.toLowerCase();
    double score = 0;
    Matcher matcher = LATIN_WORD.matcher(q);
    while (matcher.find()) {
      if (c.contains(matcher.group())) score += 2;
    }
    for (int i = 0; i < q.length() - 1; i++) {
      char a = q.charAt(i);
      char b = q.charAt(i + 1);
      if (Character.isLetterOrDigit(a) && Character.isLetterOrDigit(b)) {
        if (c.contains(q.substring(i, i + 2))) score += 1;
      }
    }
    return score;
  }

  private static double cosine(float[] a, float[] b) {
    double dot = 0;
    double na = 0;
    double nb = 0;
    int n = Math.min(a.length, b.length);
    for (int i = 0; i < n; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na == 0 || nb == 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  private static String truncate(String text, int max) {
    if (text == null) return "";
    String plain = text.replaceAll("\\s+", " ").trim();
    return plain.length() <= max ? plain : plain.substring(0, max) + "…";
  }
}
