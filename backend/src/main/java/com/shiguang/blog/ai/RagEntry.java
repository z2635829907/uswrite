package com.shiguang.blog.ai;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 管理员维护的知识条目:可手动增删改,同样参与 AI 检索。 */
@Data
@TableName("rag_entries")
public class RagEntry {
  @TableId(type = IdType.AUTO)
  private Long id;
  private String title;
  private String content;
  private String embedding;
  private Long embedded_at;
  private Long created_at;
  private Long updated_at;
}
