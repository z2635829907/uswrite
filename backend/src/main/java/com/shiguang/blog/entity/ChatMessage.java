package com.shiguang.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 用户与 AI 助手的聊天记录表。 */
@Data
@TableName("chat_messages")
public class ChatMessage {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long user_id;
  private String role;
  private String content;
  private String sources;
  private Long created_at;
}
