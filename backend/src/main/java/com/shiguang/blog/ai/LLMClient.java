package com.shiguang.blog.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    return node.path("choices").path(0).path("message").path("content").asText();
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
