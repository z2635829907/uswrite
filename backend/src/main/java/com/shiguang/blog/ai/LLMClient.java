package com.shiguang.blog.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** 调用大模型接口(OpenAI 兼容协议):支持对话与文本向量化。 */
@Service
public class LLMClient {
  private final LLMProperties props;
  private final RestClient restClient;
  private final ObjectMapper objectMapper;

  public LLMClient(LLMProperties props, RestClient.Builder builder, ObjectMapper objectMapper) {
    this.props = props;
    this.restClient = builder.build();
    this.objectMapper = objectMapper;
  }

  public boolean enabled() {
    return props.getApiKey() != null && !props.getApiKey().isBlank();
  }

  /**
   * 流式对话:请求 stream=true,把生成的增量内容逐段回调给 onDelta。
   * 使用原生 HttpClient 读取 SSE,避免为一次流式引入 WebFlux。
   */
  public void chatStream(
      List<Map<String, String>> messages, java.util.function.Consumer<String> onDelta)
      throws Exception {
    Map<String, Object> body =
        Map.of(
            "model", props.getModel(),
            "messages", messages,
            "temperature", props.getTemperature(),
            "max_tokens", props.getMaxTokens(),
            "stream", true);
    String payload = objectMapper.writeValueAsString(body);
    HttpRequest request =
        HttpRequest.newBuilder(URI.create(props.getBaseUrl() + "/chat/completions"))
            .header("Authorization", "Bearer " + props.getApiKey())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload))
            .build();
    HttpClient client = HttpClient.newHttpClient();
    HttpResponse<InputStream> response =
        client.send(request, HttpResponse.BodyHandlers.ofInputStream());
    if (response.statusCode() != 200) {
      String err =
          new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
      throw new IllegalStateException("LLM 流式请求失败: " + response.statusCode() + " " + err);
    }
    try (BufferedReader reader =
        new BufferedReader(
            new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        if (!line.startsWith("data:")) continue;
        String data = line.substring(5).trim();
        if (data.isEmpty() || "[DONE]".equals(data)) continue;
        JsonNode node = objectMapper.readTree(data);
        JsonNode choices = node.path("choices").path(0);
        String piece = choices.path("delta").path("content").asText("");
        if (piece.isEmpty()) {
          // 有的实现把内容放在 message 而非 delta
          piece = choices.path("message").path("content").asText("");
        }
        if (!piece.isEmpty()) {
          onDelta.accept(piece);
        }
      }
    }
  }

  public String chat(List<Map<String, String>> messages) throws Exception {
    Map<String, Object> body =
        Map.of(
            "model", props.getModel(),
            "messages", messages,
            "temperature", props.getTemperature(),
            "max_tokens", props.getMaxTokens(),
            "stream", false);
    String resp =
        restClient
            .post()
            .uri(props.getBaseUrl() + "/chat/completions")
            .header("Authorization", "Bearer " + props.getApiKey())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .body(String.class);
    JsonNode node = objectMapper.readTree(resp);
    JsonNode message = node.path("choices").path(0).path("message");
    String content = message.path("content").asText();
    // 带思考能力的模型(如 glm)有时只输出思考过程而未输出正式回答,
    // 取 reasoning_content 作为兜底,避免前端拿到空字符串。
    if (content.isBlank()) {
      content = message.path("reasoning_content").asText();
    }
    return content;
  }

  public float[] embed(String text) throws Exception {
    Map<String, Object> body =
        Map.of("model", props.getEmbeddingModel(), "input", List.of(text));
    String resp =
        restClient
            .post()
            .uri(props.getBaseUrl() + "/embeddings")
            .header("Authorization", "Bearer " + props.getApiKey())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .body(String.class);
    JsonNode node = objectMapper.readTree(resp);
    JsonNode emb = node.path("data").path(0).path("embedding");
    float[] result = new float[emb.size()];
    for (int i = 0; i < emb.size(); i++) {
      result[i] = (float) emb.get(i).asDouble();
    }
    return result;
  }
}
