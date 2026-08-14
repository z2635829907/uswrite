package com.shiguang.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 管理员添加/编辑知识条目的请求。 */
public record RagEntryRequest(
    @NotBlank(message = "标题不能为空") @Size(max = 200, message = "标题最大 200 个字符")
        String title,
    @NotBlank(message = "内容不能为空") @Size(max = 50000, message = "内容过长") String content) {}
