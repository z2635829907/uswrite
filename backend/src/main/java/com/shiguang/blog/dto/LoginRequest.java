package com.shiguang.blog.dto;

import jakarta.validation.constraints.NotBlank;

/** 登录请求。account 可以是用户名或邮箱。 */
public record LoginRequest(
    @NotBlank(message = "请输入用户名或邮箱") String account,
    @NotBlank(message = "请输入密码") String password) {}
