package com.shiguang.blog.ai;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiguang.blog.entity.Post;
import com.shiguang.blog.mapper.PostMapper;
import com.shiguang.blog.mapper.RagChunkMapper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * RAG 问答服务:把站内已发布文章切成小块建立索引,收到问题后检索最相关的片段,
 * 再交给大模型生成回答;未配置大模型时自动降级为“检索结果摘要”。
 */
@Service
public class RAGService {
  private static final Pattern LATIN_WORD = Pattern.compile("[a-zA-Z0-9]{2,}");
  private static final int CHUNK_SIZE = 400;
  private static final int OVERLAP = 60;
  private static final int TOP_K = 6;

  private final PostMapper postMapper;
  private final RagChunkMapper chunkMapper;
  private final LLMClient llmClient;
  private final ObjectMapper objectMapper;

  public RAGService(
      PostMapper postMapper,
      RagChunkMapper chunkMapper,
      LLMClient llmClient,
      ObjectMapper objectMapper) {
    this.postMapper = postMapper;
    this.chunkMapper = chunkMapper;
    this.llmClient = llmClient;
    this.objectMapper = objectMapper;
  }

  /** 建立/更新知识库索引:对比文章更新时间,只重建变化的部分。 */
  public void ensureIndexed() {
    List<Post> posts =
        postMapper.selectList(
            new LambdaQueryWrapper<Post>().eq(Post::getStatus, "approved"));
    List<Long> approvedIds = posts.stream().map(Post::getId).toList();
    if (approvedIds.isEmpty()) {
      chunkMapper.delete(new LambdaQueryWrapper<>());
      return;
    }
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

  /** 处理用户问题:检索 + 生成回答 + 返回参考文章。 */
  public Map<String, Object> ask(String question) {
    ensureIndexed();
    List<RagChunk> chunks =
        chunkMapper.selectList(new LambdaQueryWrapper<RagChunk>().orderByAsc(RagChunk::getId));
    if (chunks.isEmpty()) {
      return Map.of(
          "answer", "知识库还是空的,等有文章发布后再来问我吧。",
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

    List<Map.Entry<RagChunk, Double>> scored = new ArrayList<>();
    for (RagChunk chunk : chunks) {
      double keyword = keywordScore(question, chunk.getContent());
      double total = keyword;
      if (queryEmbedding != null && chunk.getEmbedding() != null) {
        try {
          float[] vec = objectMapper.readValue(chunk.getEmbedding(), float[].class);
          total = 0.7 * cosine(queryEmbedding, vec) + 0.3 * keyword;
        } catch (Exception ignored) {
          // 向量解析失败时退化为关键词得分
        }
      }
      scored.add(Map.entry(chunk, total));
    }
    scored.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
    List<RagChunk> top =
        scored.stream().limit(TOP_K).map(Map.Entry::getKey).toList();

    List<Long> postIds = top.stream().map(RagChunk::getPost_id).distinct().toList();
    Map<Long, Post> posts = new HashMap<>();
    for (Post p : postMapper.selectBatchIds(postIds)) {
      posts.put(p.getId(), p);
    }

    // 参考文章(去重,最多 5 篇)
    List<Map<String, Object>> sources = new ArrayList<>();
    Set<Long> seen = new LinkedHashSet<>();
    for (RagChunk chunk : top) {
      Post post = posts.get(chunk.getPost_id());
      if (post == null || !seen.add(post.getId())) continue;
      sources.add(
          Map.of(
              "post_id", post.getId(),
              "title", post.getTitle(),
              "slug", post.getSlug(),
              "excerpt", post.getExcerpt() == null ? "" : post.getExcerpt()));
      if (sources.size() >= 5) break;
    }

    StringBuilder context = new StringBuilder();
    for (RagChunk chunk : top) {
      Post post = posts.get(chunk.getPost_id());
      String title = post == null ? "未知文章" : post.getTitle();
      context.append("【文章:").append(title).append("】\n").append(chunk.getContent()).append("\n\n");
    }

    if (llmClient.enabled()) {
      try {
        List<Map<String, String>> messages =
            List.of(
                Map.of(
                    "role",
                    "system",
                    "content",
                    "你是“拾光”博客社区的AI助手。请只根据下面提供的站内文章资料回答用户问题,"
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
      fallback.append("• ").append(truncate(top.get(i).getContent(), 160)).append("\n\n");
    }
    fallback.append("配置大模型 API Key 后,我就能基于这些内容给出智能回答。");
    return Map.of("answer", fallback.toString(), "sources", sources, "llm", false);
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

  /** 关键词匹配得分:英文单词 + 中文二元组。 */
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
