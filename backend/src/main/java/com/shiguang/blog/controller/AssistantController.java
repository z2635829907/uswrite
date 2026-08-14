package com.shiguang.blog.controller;

import com.shiguang.blog.ai.RAGService;
import com.shiguang.blog.ai.ChatHistoryService;
import com.shiguang.blog.common.Api;
import com.shiguang.blog.common.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** AI 助手接口:接收用户问题,返回检索增强后的回答。 */
@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
  private final RAGService ragService;
  private final ChatHistoryService chatHistoryService;

  public AssistantController(RAGService ragService, ChatHistoryService chatHistoryService) {
    this.ragService = ragService;
    this.chatHistoryService = chatHistoryService;
  }

  public record ChatRequest(
      @NotBlank(message = "问题不能为空") @Size(max = 500, message = "问题太长了") String question) {}

  @PostMapping("/chat")
  public Map<String, Object> chat(@Valid @RequestBody ChatRequest req) {
    String question = req.question().trim();
    Map<String, Object> result = ragService.ask(question);
    Long userId = SecurityUtils.currentUserId();
    if (userId != null) {
      chatHistoryService.save(userId, "user", question, null);
      chatHistoryService.save(
          userId, "assistant", String.valueOf(result.get("answer")), result.get("sources"));
    }
    return Api.ok(result);
  }

  /** 登录用户查看自己的聊天记录。 */
  @GetMapping("/history")
  public Map<String, Object> history(@RequestParam(defaultValue = "200") int limit) {
    return Api.ok(
        "messages",
        chatHistoryService.list(SecurityUtils.requireUserId(), Math.min(limit, 500)));
  }

  @DeleteMapping("/history")
  public Map<String, Object> clearHistory() {
    chatHistoryService.clear(SecurityUtils.requireUserId());
    return Api.ok();
  }
}
