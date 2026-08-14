package com.shiguang.blog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 写文章请求(创建与编辑共用)。action 为 draft 保存草稿 / submit 提交审核。 */
public record PostRequest(
    @NotBlank(message = "标题不能为空") @Size(max = 80, message = "标题最大 80 个字符") String title,
    @NotBlank(message = "内容不能为空") @Size(max = 50000, message = "内容过长") String content,
    @Size(max = 200, message = "摘要最大 200 个字符") String excerpt,
    @Size(max = 80, message = "标签过长") String tags,
    @Size(max = 100, message = "封面种子过长") String coverSeed,
    String category,
    @NotBlank(message = "缺少操作类型") String action) {

  public PostRequest {
    if (excerpt == null) excerpt = "";
    if (tags == null) tags = "";
    if (coverSeed == null) coverSeed = "";
    if (category == null || category.isBlank()) category = "uncategorized";
  }
}
