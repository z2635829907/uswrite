package com.shiguang.blog.dto;

import jakarta.validation.constraints.Size;

/** 个人资料更新请求。 */
public record ProfileRequest(
    @Size(min = 1, max = 20, message = "昵称长度需在 1~20 个字符之间") String displayName,
    @Size(max = 200, message = "简介最大 200 个字符") String bio,
    @Size(max = 200, message = "网址过长") String website,
    @Size(max = 100, message = "头像种子过长") String avatarSeed) {}
