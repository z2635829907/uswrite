package com.shiguang.blog.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 收藏表。 */
@Data
@TableName("bookmarks")
public class Bookmark {
  @TableId(type = IdType.AUTO)
  private Long id;
  private Long user_id;
  private Long post_id;
  private Long created_at;
}
