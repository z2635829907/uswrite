package com.shiguang.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 通知表。 */
@Data
@TableName("notifications")
public class Notification {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long user_id;
  private Long actor_id;
  private String type;
  private Long post_id;
  private String content;
  @TableField("`read`")
  private Integer read;
  private Long created_at;
}
