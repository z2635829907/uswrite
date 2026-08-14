package com.shiguang.blog.ai;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** RAG 知识库分块表:文章内容被切成小块,便于检索。 */
@Data
@TableName("rag_chunks")
public class RagChunk {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long post_id;
  private Integer chunk_index;
  private String content;
  private String embedding;
  private Long created_at;
}
