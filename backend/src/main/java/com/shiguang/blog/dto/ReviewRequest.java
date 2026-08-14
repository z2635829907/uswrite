package com.shiguang.blog.dto;

import jakarta.validation.constraints.NotBlank;

/** 管理员审核请求:decision 为 approve / reject。 */
public record ReviewRequest(@NotBlank(message = "缺少审核决定") String decision, String reason) {}
