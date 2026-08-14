package com.shiguang.blog.controller;

import com.shiguang.blog.ai.RAGService;
import com.shiguang.blog.common.Api;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** AI 助手接口:接收用户问题,返回检索增强后的回答。 */
@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
  private final RAGService ragService;

  public AssistantController(RAGService ragService) {
    this.ragService = ragService;
  }

  public record ChatRequest(
      @NotBlank(message = "问题不能为空") @Size(max = 500, message = "问题太长了") String question) {}

  @PostMapping("/chat")
  public Map<String, Object> chat(@Valid @RequestBody ChatRequest req) {
    return Api.ok(ragService.ask(req.question().trim()));
  }
}
