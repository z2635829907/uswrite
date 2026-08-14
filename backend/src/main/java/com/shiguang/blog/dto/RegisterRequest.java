package com.shiguang.blog.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 注册请求。字段名与前端发送的 JSON 一致。 */
public record RegisterRequest(
    @NotBlank(message = "用户名不能为空")
        @Size(min = 2, max = 20, message = "用户名长度需在 2~20 个字符之间")
        @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "用户名只能包含字母、数字和下划线")
        String username,
    @NotBlank(message = "邮箱不能为空") @Email(message = "邮箱格式不正确") String email,
    @NotBlank(message = "密码不能为空") @Size(min = 8, message = "密码至少 8 位") String password,
    @NotBlank(message = "昵称不能为空") @Size(max = 20, message = "昵称最大 20 个字符")
        String displayName) {}
