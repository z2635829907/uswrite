package com.shiguang.blog.ai;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 大模型接口配置:通过环境变量 SPRING_LLM_* 注入。 */
@Data
@Component
@ConfigurationProperties(prefix = "app.llm")
public class LLMProperties {
  private String baseUrl = "https://api.deepseek.com";
  private String apiKey = "";
  private String model = "deepseek-chat";
  private String embeddingModel = "text-embedding-3-small";
  private double temperature = 0.4;
  private int maxTokens = 800;
}
