package com.shiguang.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 评论表。 */
@Data
@TableName("comments")
public class Comment {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long post_id;
  private Long user_id;
  private String content;
  private String status;
  private Long created_at;
}
