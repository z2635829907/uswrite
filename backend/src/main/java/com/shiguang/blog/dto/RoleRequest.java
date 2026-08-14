package com.shiguang.blog.dto;

import jakarta.validation.constraints.NotBlank;

public record RoleRequest(@NotBlank(message = "缺少角色") String role) {}
