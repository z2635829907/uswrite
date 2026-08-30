package com.shiguang.blog.ai;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiguang.blog.entity.ChatMessage;
import com.shiguang.blog.mapper.ChatMessageMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** 用户与 AI 助手的聊天记录:保存、读取、清空。 */
@Service
public class ChatHistoryService {
  private final ChatMessageMapper chatMessageMapper;
  private final ObjectMapper objectMapper;

  public ChatHistoryService(ChatMessageMapper chatMessageMapper, ObjectMapper objectMapper) {
    this.chatMessageMapper = chatMessageMapper;
    this.objectMapper = objectMapper;
  }

  public void save(Long userId, String role, String content, Object sources) {
    ChatMessage message = new ChatMessage();
    message.setUser_id(userId);
    message.setRole(role);
    message.setContent(content);
    message.setCreated_at(System.currentTimeMillis());
    if (sources != null) {
      try {
        message.setSources(objectMapper.writeValueAsString(sources));
      } catch (Exception ignored) {
        // 来源信息保存失败不影响聊天内容
      }
    }
    chatMessageMapper.insert(message);
  }

  public List<Map<String, Object>> list(Long userId, int limit) {
    List<ChatMessage> rows =
        chatMessageMapper.selectList(
            new LambdaQueryWrapper<ChatMessage>()
                .eq(ChatMessage::getUser_id, userId)
                .orderByAsc(ChatMessage::getCreated_at)
                .last("LIMIT " + limit));
    List<Map<String, Object>> result = new ArrayList<>();
    for (ChatMessage row : rows) {
      result.add(toMap(row));
    }
    return result;
  }

  /** 取最近的 limit 条聊天记录(按时间正序),用于多轮上下文注入。 */
  public List<Map<String, Object>> recent(Long userId, int limit) {
    List<ChatMessage> rows =
        chatMessageMapper.selectList(
            new LambdaQueryWrapper<ChatMessage>()
                .eq(ChatMessage::getUser_id, userId)
                .orderByDesc(ChatMessage::getCreated_at)
                .last("LIMIT " + limit));
    java.util.Collections.reverse(rows);
    List<Map<String, Object>> result = new ArrayList<>();
    for (ChatMessage row : rows) result.add(toMap(row));
    return result;
  }

  private Map<String, Object> toMap(ChatMessage row) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", row.getId());
    item.put("role", row.getRole());
    item.put("content", row.getContent());
    item.put("created_at", row.getCreated_at());
    if (row.getSources() != null && !row.getSources().isBlank()) {
      try {
        item.put("sources", objectMapper.readValue(row.getSources(), List.class));
      } catch (Exception ignored) {
        // 来源解析失败则忽略
      }
    }
    return item;
  }

  public void clear(Long userId) {
    chatMessageMapper.delete(
        new LambdaQueryWrapper<ChatMessage>().eq(ChatMessage::getUser_id, userId));
  }
}
