package com.shiguang.blog.ai;

import com.huaban.analysis.jieba.JiebaSegmenter;
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
import java.util.stream.Collectors;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * RAG 问答服务:检索范围 = 站内已发布文章 + 管理员维护的知识条目。
 * 收到问题后检索最相关的片段,再交给大模型生成回答;未配置大模型时自动降级。
 */
@Service
public class RAGService {
  private static final int CHUNK_SIZE = 600;
  private static final int MAX_CHUNK = 1200;
  private static final int TOP_K = 6;

  private final PostMapper postMapper;
  private final RagChunkMapper chunkMapper;
  private final RagEntryMapper ragEntryMapper;
  private final LLMClient llmClient;
  private final ObjectMapper objectMapper;
  // 中文分词器,用于 BM25 关键词检索;jieba 非线程安全,用 synchronized 保护
  private final JiebaSegmenter jieba = new JiebaSegmenter();

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

  /** 一次问答的检索产物:组装好的消息、参考来源、命中片段。 */
  private record RagPlan(
      List<Map<String, String>> messages,
      List<Map<String, Object>> sources,
      List<ChunkItem> top) {}

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
  public Map<String, Object> ask(String question, List<Map<String, String>> history) {
    RagPlan plan = buildPlan(question, history);
    if (plan == null) {
      return Map.of(
          "answer", "知识库还是空的,等有文章发布或管理员添加知识后再来问我吧。",
          "sources", List.of(),
          "llm", false);
    }
    if (llmClient.enabled()) {
      try {
        String answer = llmClient.chat(plan.messages());
        return Map.of("answer", answer, "sources", plan.sources(), "llm", true);
      } catch (Exception e) {
        // 大模型调用失败时走降级回答
      }
    }
    return fallback(plan.top(), plan.sources());
  }

  /** 流式处理:检索完成后,把生成结果逐段推给 onDelta 回调。 */
  public Map<String, Object> askStream(
      String question,
      List<Map<String, String>> history,
      java.util.function.Consumer<String> onDelta) {
    RagPlan plan = buildPlan(question, history);
    if (plan == null) {
      return Map.of(
          "empty", true, "answer", "知识库还是空的…", "sources", List.of(), "llm", false);
    }
    if (llmClient.enabled()) {
      try {
        llmClient.chatStream(plan.messages(), onDelta);
        return Map.of("sources", plan.sources(), "llm", true);
      } catch (Exception e) {
        // 流式失败时降级
      }
    }
    return fallback(plan.top(), plan.sources());
  }

  private Map<String, Object> fallback(List<ChunkItem> top, List<Map<String, Object>> sources) {
    StringBuilder fallback = new StringBuilder("我根据站内文章找到了这些相关内容:\n\n");
    for (int i = 0; i < Math.min(3, top.size()); i++) {
      fallback.append("• ").append(truncate(top.get(i).content(), 160)).append("\n\n");
    }
    fallback.append("配置大模型 API Key 后,我就能基于这些内容给出智能回答。");
    return Map.of("answer", fallback.toString(), "sources", sources, "llm", false);
  }

  /** 检索 + 拼上下文 + 组装消息。知识库为空时返回 null。 */
  private RagPlan buildPlan(String question, List<Map<String, String>> history) {
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
    if (items.isEmpty()) return null;

    float[] queryEmbedding = null;
    if (llmClient.enabled()) {
      try {
        queryEmbedding = llmClient.embed(question);
      } catch (Exception ignored) {
        queryEmbedding = null;
      }
    }

    // —— BM25 关键词 + 语义向量 混合检索 ——
    List<List<String>> docTokens = new ArrayList<>();
    for (ChunkItem item : items) docTokens.add(tokenize(item.content()));
    List<String> qTokens = tokenize(question);
    Map<String, Integer> df = buildDocFreq(docTokens);
    int totalDocs = items.size();
    double avgdl = docTokens.stream().mapToInt(List::size).average().orElse(1.0);
    Map<String, Double> idf = buildIdf(df, totalDocs);

    List<Map.Entry<ChunkItem, Double>> scored = new ArrayList<>();
    for (int i = 0; i < items.size(); i++) {
      ChunkItem item = items.get(i);
      double semantic = 0;
      if (queryEmbedding != null && item.embedding() != null) {
        try {
          float[] vec = objectMapper.readValue(item.embedding(), float[].class);
          semantic = Math.max(0, cosine(queryEmbedding, vec));
        } catch (Exception ignored) {
          // 向量解析失败时退化为关键词得分
        }
      }
      double bm25 = bm25Score(qTokens, docTokens.get(i), idf, avgdl, 1.5, 0.75);
      double bm25Norm = bm25 / (bm25 + 1.0);
      double total = queryEmbedding != null ? 0.6 * semantic + 0.4 * bm25Norm : bm25Norm;
      scored.add(Map.entry(item, total));
    }
    scored.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
    List<ChunkItem> top = scored.stream().limit(TOP_K).map(Map.Entry::getKey).toList();

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

    List<Map<String, String>> messages = new ArrayList<>();
    messages.add(
        Map.of(
            "role",
            "system",
            "content",
            "你是“uswrite”博客社区的AI助手。请只根据下面提供的站内文章资料回答用户问题,"
                + "不要编造资料中没有的信息;回答用中文,简洁有条理。"
                + "凡涉及社区名称一律使用“uswrite”,不要使用旧称“拾光”。"
                + "用户可能连续追问,请结合对话历史理解上下文。"));
    if (history != null) {
      for (Map<String, String> h : history) {
        String role = h.get("role");
        String content = h.get("content");
        if (content == null || content.isBlank()) continue;
        if (!"user".equals(role) && !"assistant".equals(role)) continue;
        messages.add(Map.of("role", role, "content", content));
      }
    }
    messages.add(
        Map.of(
            "role",
            "user",
            "content",
            "站内文章资料:\n" + context + "\n用户问题:" + question));
    return new RagPlan(messages, sources, top);
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

  /**
   * 按 Markdown 结构切块:以 # 标题为锚点,同属一个标题的段落尽量放一起。
   * 每块开头带所属标题作为上下文,避免跨标题割裂语义。
   */
  private static List<String> chunkText(String text) {
    String[] lines = text.split("\\r?\\n");
    List<String> chunks = new ArrayList<>();
    StringBuilder buffer = new StringBuilder();
    String heading = "";
    for (String raw : lines) {
      String line = raw.trim();
      if (line.isEmpty()) continue;
      String h = markdownHeading(line);
      if (h != null) {
        pushChunk(chunks, buffer);
        heading = h;
        buffer.setLength(0);
        appendHeading(buffer, heading);
        continue;
      }
      if (buffer.length() > 0 && buffer.length() + line.length() > CHUNK_SIZE) {
        pushChunk(chunks, buffer);
        buffer.setLength(0);
        appendHeading(buffer, heading);
      }
      buffer.append(line).append("\n");
    }
    pushChunk(chunks, buffer);
    return chunks;
  }

  /** 判断一行是否为 Markdown 标题,是则返回标题文本,否则返回 null。 */
  private static String markdownHeading(String line) {
    if (!line.startsWith("#")) return null;
    int i = 0;
    while (i < line.length() && line.charAt(i) == '#') i++;
    if (i <= 6 && i < line.length() && line.charAt(i) == ' ') {
      return line.substring(i).trim();
    }
    return null;
  }

  private static void appendHeading(StringBuilder sb, String heading) {
    if (heading != null && !heading.isEmpty()) {
      sb.append("【").append(heading).append("】\n");
    }
  }

  private static void pushChunk(List<String> chunks, StringBuilder buffer) {
    String s = buffer.toString().trim();
    if (s.isEmpty()) return;
    if (s.length() > MAX_CHUNK) {
      s = s.substring(0, MAX_CHUNK);
    }
    chunks.add(s);
  }

  /** jieba 中文分词,过滤纯标点,统一小写,token 用于 BM25 关键词检索。 */
  private List<String> tokenize(String text) {
    List<String> out = new ArrayList<>();
    synchronized (jieba) {
      for (String t : jieba.sentenceProcess(text)) {
        String w = t.trim();
        if (w.isEmpty()) continue;
        if (!containsLetterOrDigit(w)) continue;
        out.add(w.toLowerCase());
      }
    }
    return out;
  }

  private static boolean containsLetterOrDigit(String s) {
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (Character.isLetterOrDigit(c)) return true;
    }
    return false;
  }

  /** 统计每个词出现在多少篇文档里(文档频率 df)。 */
  private static Map<String, Integer> buildDocFreq(List<List<String>> docs) {
    Map<String, Integer> df = new HashMap<>();
    for (List<String> doc : docs) {
      Set<String> seen = new java.util.HashSet<>(doc);
      for (String t : seen) df.merge(t, 1, Integer::sum);
    }
    return df;
  }

  /** 由 df 计算逆文档频率 idf。 */
  private static Map<String, Double> buildIdf(Map<String, Integer> df, int totalDocs) {
    Map<String, Double> idf = new HashMap<>();
    for (Map.Entry<String, Integer> e : df.entrySet()) {
      int d = e.getValue();
      idf.put(e.getKey(), Math.log((totalDocs - d + 0.5) / (d + 0.5) + 1));
    }
    return idf;
  }

  /** BM25 打分。k1=1.5, b=0.75 为常用经验值。 */
  private static double bm25Score(
      List<String> query,
      List<String> doc,
      Map<String, Double> idf,
      double avgdl,
      double k1,
      double b) {
    if (doc.isEmpty() || query.isEmpty()) return 0;
    double dl = doc.size();
    Map<String, Integer> tf = new HashMap<>();
    for (String t : doc) tf.merge(t, 1, Integer::sum);
    double score = 0;
    for (String t : query) {
      Integer f = tf.get(t);
      if (f == null) continue;
      double idfVal = idf.getOrDefault(t, 0.0);
      score += idfVal * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / Math.max(avgdl, 1)));
    }
    return score;
  }

  /** 文章发布/审核通过或内容更新后,重建该文章的知识块;非发布状态则移除。 */
  public void syncPost(Post post) {
    if (post == null) return;
    if ("approved".equals(post.getStatus())) {
      indexPost(post);
    } else {
      chunkMapper.delete(
          new LambdaQueryWrapper<RagChunk>().eq(RagChunk::getPost_id, post.getId()));
    }
  }

  /** 删除文章后移除其知识块。 */
  public void removePost(Long postId) {
    if (postId == null) return;
    chunkMapper.delete(new LambdaQueryWrapper<RagChunk>().eq(RagChunk::getPost_id, postId));
  }

  /** 定时兜底:每 15 分钟做一次增量索引,保证文章/知识库变动最终一致。 */
  @Scheduled(fixedDelay = 15 * 60 * 1000)
  public void scheduledMaintenance() {
    try {
      ensureIndexed();
    } catch (Exception ignored) {
      // 定时巡检失败不影响主流程,下轮重试
    }
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
