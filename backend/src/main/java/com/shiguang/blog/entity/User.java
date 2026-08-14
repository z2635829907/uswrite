package com.shiguang.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 用户表。字段名与数据库列一一对应(snake_case)。 */
@Data
@TableName("users")
public class User {
  @TableId(type = IdType.AUTO)
  private Long id;
  private String username;
  private String email;
  private String password_hash;
  private String display_name;
  private String bio;
  private String website;
  private String avatar_seed;
  private String role;
  private String status;
  private Long created_at;
  private Long updated_at;
}
