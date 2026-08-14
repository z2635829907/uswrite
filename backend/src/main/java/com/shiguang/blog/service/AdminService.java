package com.shiguang.blog.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.shiguang.blog.common.ApiException;
import com.shiguang.blog.entity.Comment;
import com.shiguang.blog.entity.Post;
import com.shiguang.blog.entity.User;
import com.shiguang.blog.mapper.CommentMapper;
import com.shiguang.blog.mapper.PostMapper;
import com.shiguang.blog.mapper.UserMapper;
import com.shiguang.blog.view.CommentView;
import com.shiguang.blog.view.PostView;
import com.shiguang.blog.view.UserView;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** 管理员服务:后台统计、文章审核、用户管理、评论管理。 */
@Service
public class AdminService {
  private final UserMapper userMapper;
  private final PostMapper postMapper;
  private final CommentMapper commentMapper;
  private final PostService postService;
  private final NotificationService notificationService;

  public AdminService(
      UserMapper userMapper,
      PostMapper postMapper,
      CommentMapper commentMapper,
      PostService postService,
      NotificationService notificationService) {
    this.userMapper = userMapper;
    this.postMapper = postMapper;
    this.commentMapper = commentMapper;
    this.postService = postService;
    this.notificationService = notificationService;
  }

  public void requireAdmin(Long userId) {
    User user = userMapper.selectById(userId);
    if (user == null || !"admin".equals(user.getRole())) {
      throw new ApiException(403, "需要管理员权限");
    }
  }

  public Map<String, Long> overview() {
    long pending =
        postMapper.selectCount(new LambdaQueryWrapper<Post>().eq(Post::getStatus, "pending"));
    long users = userMapper.selectCount(null);
    long posts = postMapper.selectCount(null);
    long comments = commentMapper.selectCount(null);
    return Map.of(
        "pendingPosts", pending, "users", users, "posts", posts, "comments", comments);
  }

  public Map<String, Object> listPosts(
      String status, String category, String q, int page, int pageSize) {
    LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<>();
    if (status != null && !status.isBlank()) {
      wrapper.eq(Post::getStatus, status);
    }
    if (category != null && !category.isBlank()) {
      wrapper.eq(Post::getCategory, category);
    }
    if (q != null && !q.isBlank()) {
      wrapper.and(w -> w.like(Post::getTitle, q).or().like(Post::getContent, q));
    }
    wrapper.orderByDesc(Post::getCreated_at);
    Page<Post> p = postMapper.selectPage(new Page<>(page, pageSize), wrapper);
    return Map.of(
        "posts", postService.toViews(p.getRecords(), null),
        "total", p.getTotal(),
        "page", p.getCurrent(),
        "pageSize", p.getSize());
  }

  public void review(Long adminId, Long postId, String decision, String reason) {
    requireAdmin(adminId);
    Post post = postMapper.selectById(postId);
    if (post == null) {
      throw new ApiException(404, "文章不存在");
    }
    long now = System.currentTimeMillis();
    String content;
    if ("approve".equals(decision)) {
      post.setStatus("approved");
      if (post.getPublished_at() == null) {
        post.setPublished_at(now);
      }
      post.setRejection_reason("");
      content = "你的文章《" + post.getTitle() + "》已通过审核";
    } else if ("reject".equals(decision)) {
      post.setStatus("rejected");
      post.setRejection_reason(reason == null ? "" : reason.trim());
      content =
          "你的文章《"
              + post.getTitle()
              + "》未通过审核"
              + (post.getRejection_reason().isEmpty() ? "" : "：" + post.getRejection_reason());
    } else {
      throw new ApiException(400, "审核决定只能是 approve 或 reject");
    }
    post.setUpdated_at(now);
    postMapper.updateById(post);
    notificationService.create(post.getAuthor_id(), adminId, "review", postId, content);
  }

  public List<UserView> listUsers(String q) {
    LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
    if (q != null && !q.isBlank()) {
      wrapper.and(
          w ->
              w.like(User::getUsername, q)
                  .or()
                  .like(User::getDisplay_name, q)
                  .or()
                  .like(User::getEmail, q));
    }
    wrapper.orderByDesc(User::getCreated_at);
    return userMapper.selectList(wrapper).stream().map(postService::toUserView).toList();
  }

  public void updateRole(Long adminId, Long userId, String role) {
    requireAdmin(adminId);
    if (!List.of("user", "admin").contains(role)) {
      throw new ApiException(400, "角色只能是 user 或 admin");
    }
    User user = userMapper.selectById(userId);
    if (user == null) {
      throw new ApiException(404, "用户不存在");
    }
    user.setRole(role);
    user.setUpdated_at(System.currentTimeMillis());
    userMapper.updateById(user);
  }

  public void updateStatus(Long adminId, Long userId, String status) {
    requireAdmin(adminId);
    if (!List.of("active", "banned").contains(status)) {
      throw new ApiException(400, "状态只能是 active 或 banned");
    }
    if (adminId.equals(userId) && "banned".equals(status)) {
      throw new ApiException(400, "不能禁用自己的账号");
    }
    User user = userMapper.selectById(userId);
    if (user == null) {
      throw new ApiException(404, "用户不存在");
    }
    user.setStatus(status);
    user.setUpdated_at(System.currentTimeMillis());
    userMapper.updateById(user);
  }

  public List<Map<String, Object>> listComments() {
    List<Comment> comments =
        commentMapper.selectList(
            new LambdaQueryWrapper<Comment>().orderByDesc(Comment::getCreated_at).last("LIMIT 200"));
    if (comments.isEmpty()) {
      return List.of();
    }
    List<Long> userIds = comments.stream().map(Comment::getUser_id).distinct().toList();
    List<Long> postIds = comments.stream().map(Comment::getPost_id).distinct().toList();
    Map<Long, User> users =
        userMapper.selectBatchIds(userIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
    Map<Long, Post> posts =
        postMapper.selectBatchIds(postIds).stream()
            .collect(Collectors.toMap(Post::getId, Function.identity()));
    List<Map<String, Object>> result = new ArrayList<>();
    for (Comment c : comments) {
      Map<String, Object> item = new HashMap<>();
      item.put("id", c.getId());
      item.put("content", c.getContent());
      item.put("status", c.getStatus());
      item.put("created_at", c.getCreated_at());
      User author = users.get(c.getUser_id());
      if (author != null) {
        item.put("author", postService.toUserView(author));
      }
      Post post = posts.get(c.getPost_id());
      if (post != null) {
        item.put("post_title", post.getTitle());
        item.put("post_slug", post.getSlug());
      }
      result.add(item);
    }
    return result;
  }

  public void deleteComment(Long adminId, Long commentId) {
    requireAdmin(adminId);
    commentMapper.deleteById(commentId);
  }
}
