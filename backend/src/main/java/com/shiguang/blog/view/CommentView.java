package com.shiguang.blog.view;

import lombok.Data;

/** 返回给前端的评论信息。 */
@Data
public class CommentView {
  private Long id;
  private Long post_id;
  private Long user_id;
  private String content;
  private String status;
  private Long created_at;
  private UserView author;
}
