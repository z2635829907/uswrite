package com.shiguang.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 文章表。 */
@Data
@TableName("posts")
public class Post {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long author_id;
  private String slug;
  private String title;
  private String content;
  private String excerpt;
  private String cover_seed;
  private String tags;
  private String category;
  private String status;
  private String rejection_reason;
  private Integer views;
  private Long created_at;
  private Long updated_at;
  private Long published_at;
}
