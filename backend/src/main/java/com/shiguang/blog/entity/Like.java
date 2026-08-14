package com.shiguang.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 点赞表。 */
@Data
@TableName("likes")
public class Like {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long user_id;
  private Long post_id;
  private Long created_at;
}
