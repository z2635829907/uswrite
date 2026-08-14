package com.shiguang.blog.dto;

import jakarta.validation.constraints.NotBlank;

public record StatusRequest(@NotBlank(message = "缺少状态") String status) {}
