package com.shiguang.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
    @NotBlank(message = "评论不能为空") @Size(max = 1000, message = "评论最大 1000 个字符")
        String content) {}
