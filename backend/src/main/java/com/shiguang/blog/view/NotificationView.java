package com.shiguang.blog.view;

import lombok.Data;

/** 返回给前端的通知信息。 */
@Data
public class NotificationView {
  private Long id;
  private Long user_id;
  private Long actor_id;
  private String type;
  private Long post_id;
  private String content;
  private Integer read;
  private Long created_at;
  private UserView actor;
  private String post_slug;
  private String post_title;
}
