package com.shiguang.blog.view;

import lombok.AllArgsConstructor;
import lombok.Data;

/** 返回给前端的用户信息(不含密码)。字段名与前端一致。 */
@Data
@AllArgsConstructor
public class UserView {
  private Long id;
  private String username;
  private String display_name;
  private String bio;
  private String website;
  private String avatar_seed;
  private String role;
  private Long created_at;
}
