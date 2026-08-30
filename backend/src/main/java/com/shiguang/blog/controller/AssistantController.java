package com.shiguang.blog.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiguang.blog.ai.RAGService;
import com.shiguang.blog.ai.ChatHistoryService;
import com.shiguang.blog.common.Api;
import com.shiguang.blog.common.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** AI 助手接口:接收用户问题,返回检索增强后的回答。 */
@RestController
@RequestMapping("/api/assistant")
public class AssistantController {
  private final RAGService ragService;
  private final ChatHistoryService chatHistoryService;
  private final ObjectMapper objectMapper;

  public AssistantController(
      RAGService ragService, ChatHistoryService chatHistoryService, ObjectMapper objectMapper) {
    this.ragService = ragService;
    this.chatHistoryService = chatHistoryService;
    this.objectMapper = objectMapper;
  }

  public record ChatRequest(
      @NotBlank(message = "问题不能为空") @Size(max = 500, message = "问题太长了") String question) {}

  @PostMapping("/chat")
  public Map<String, Object> chat(@Valid @RequestBody ChatRequest req) {
    String question = req.question().trim();
    Long userId = SecurityUtils.currentUserId();
    Map<String, Object> result = ragService.ask(question, buildHistory(userId));
    if (userId != null) {
      chatHistoryService.save(userId, "user", question, null);
      chatHistoryService.save(
          userId, "assistant", String.valueOf(result.get("answer")), result.get("sources"));
    }
    return Api.ok(result);
  }

  /** 流式问答:SSE 逐段推送增量回答,最后推送来源与完成标记。 */
  @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter chatStream(@Valid @RequestBody ChatRequest req) {
    String question = req.question().trim();
    Long userId = SecurityUtils.currentUserId();
    List<Map<String, String>> history = buildHistory(userId);
    SseEmitter emitter = new SseEmitter(180_000L);
    CompletableFuture.runAsync(
        () -> {
          StringBuilder collected = new StringBuilder();
          try {
            Map<String, Object> meta =
                ragService.askStream(
                    question,
                    history,
                    piece -> {
                      collected.append(piece);
                      sendEvent(emitter, "delta", Map.of("delta", piece));
                    });
            if (meta.containsKey("answer")) {
              // 降级回答:直接把完整文本作为一段增量发出
              sendEvent(emitter, "delta", Map.of("delta", String.valueOf(meta.get("answer"))));
            }
            Map<String, Object> done = new LinkedHashMap<>();
            done.put("sources", meta.getOrDefault("sources", List.of()));
            done.put("llm", meta.getOrDefault("llm", false));
            done.put("done", true);
            sendEvent(emitter, "meta", done);
            emitter.complete();
            if (userId != null) {
              chatHistoryService.save(userId, "user", question, null);
              chatHistoryService.save(
                  userId, "assistant", collected.toString(), done.get("sources"));
            }
          } catch (Exception e) {
            sendEvent(
                emitter,
                "error",
                Map.of("error", e.getMessage() == null ? "流式回答失败" : e.getMessage()));
            emitter.completeWithError(e);
          }
        });
    return emitter;
  }

  private List<Map<String, String>> buildHistory(Long userId) {
    List<Map<String, String>> history = new ArrayList<>();
    if (userId == null) return history;
    for (Map<String, Object> m : chatHistoryService.recent(userId, 6)) {
      String role = String.valueOf(m.get("role"));
      String content = String.valueOf(m.get("content"));
      if (("user".equals(role) || "assistant".equals(role))
          && content != null
          && !content.isBlank()) {
        history.add(Map.of("role", role, "content", content));
      }
    }
    return history;
  }

  private void sendEvent(SseEmitter emitter, String name, Object data) {
    try {
      emitter.send(SseEmitter.event().name(name).data(objectMapper.writeValueAsString(data)));
    } catch (Exception ignored) {
      // 客户端断开等场景直接忽略
    }
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
