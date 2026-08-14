package com.shiguang.blog.view;

import java.util.List;
import lombok.Data;

/** 返回给前端的文章信息,和前端 PostWithMeta 字段一一对应。 */
@Data
public class PostView {
  private Long id;
  private Long author_id;
  private String slug;
  private String title;
  private String content;
  private String excerpt;
  private String cover_seed;
  private String tags;
  private List<String> tagsList;
  private String category;
  private String status;
  private String rejection_reason;
  private Integer views;
  private Long created_at;
  private Long updated_at;
  private Long published_at;
  private Long like_count;
  private Long comment_count;
  private Boolean liked_by_me;
  private Boolean bookmarked_by_me;
  private UserView author;
}
