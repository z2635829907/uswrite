package com.shiguang.blog.controller;

import com.shiguang.blog.common.Api;
import com.shiguang.blog.common.ApiException;
import com.shiguang.blog.common.SecurityUtils;
import com.shiguang.blog.dto.CommentRequest;
import com.shiguang.blog.dto.PostRequest;
import com.shiguang.blog.entity.User;
import com.shiguang.blog.service.PostService;
import com.shiguang.blog.view.PostView;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 文章、评论、点赞、收藏、统计、标签、推荐等接口。 */
@RestController
public class PostController {
  private final PostService postService;

  public PostController(PostService postService) {
    this.postService = postService;
  }

  @GetMapping("/api/posts")
  public Map<String, Object> list(
      @RequestParam(required = false) String tag,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String sort,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize) {
    return Api.ok(
        postService.list(tag, category, q, sort, page, Math.min(pageSize, 24),
            SecurityUtils.currentUserId()));
  }

  @GetMapping("/api/posts/{slug}")
  public Map<String, Object> detail(@PathVariable String slug) {
    PostView post = postService.getBySlug(slug, SecurityUtils.currentUserId());
    return Api.ok("post", post);
  }

  @GetMapping("/api/posts/by-id/{id}")
  public Map<String, Object> byId(@PathVariable Long id) {
    PostView post = postService.getById(id, SecurityUtils.currentUserId());
    return Api.ok("post", post);
  }

  @GetMapping("/api/posts/{id}/related")
  public Map<String, Object> related(
      @PathVariable Long id, @RequestParam(defaultValue = "3") int limit) {
    return Api.ok(
        "posts", postService.related(id, SecurityUtils.currentUserId(), Math.min(limit, 6)));
  }

  @PostMapping("/api/posts")
  public Map<String, Object> create(@Valid @RequestBody PostRequest req) {
    return Api.ok(postService.create(SecurityUtils.requireUserId(), req));
  }

  @PatchMapping("/api/posts/{id}")
  public Map<String, Object> update(
      @PathVariable Long id, @Valid @RequestBody PostRequest req) {
    return Api.ok(postService.update(SecurityUtils.requireUserId(), id, req));
  }

  @DeleteMapping("/api/posts/{id}")
  public Map<String, Object> delete(@PathVariable Long id) {
    postService.delete(SecurityUtils.requireUserId(), id);
    return Api.ok();
  }

  @PostMapping("/api/posts/{id}/like")
  public Map<String, Object> like(@PathVariable Long id) {
    return Api.ok(postService.toggleLike(SecurityUtils.requireUserId(), id));
  }

  @PostMapping("/api/posts/{id}/bookmark")
  public Map<String, Object> bookmark(@PathVariable Long id) {
    return Api.ok(postService.toggleBookmark(SecurityUtils.requireUserId(), id));
  }

  @PostMapping("/api/posts/{id}/view")
  public Map<String, Object> view(@PathVariable Long id) {
    postService.incrementViews(id);
    return Api.ok();
  }

  @GetMapping("/api/posts/{id}/comments")
  public Map<String, Object> comments(@PathVariable Long id) {
    return Api.ok("comments", postService.listComments(id));
  }

  @PostMapping("/api/posts/{id}/comments")
  public Map<String, Object> addComment(
      @PathVariable Long id, @Valid @RequestBody CommentRequest req) {
    return Api.ok(postService.addComment(SecurityUtils.requireUserId(), id, req.content()));
  }

  @DeleteMapping("/api/comments/{id}")
  public Map<String, Object> deleteComment(@PathVariable Long id) {
    postService.deleteComment(SecurityUtils.requireUserId(), id);
    return Api.ok();
  }

  @GetMapping("/api/users/{username}")
  public Map<String, Object> user(@PathVariable String username) {
    User user = postService.findByUsername(username);
    if (user == null) {
      throw new ApiException(404, "用户不存在");
    }
    return Api.ok("user", postService.toUserView(user));
  }

  @GetMapping("/api/users/{username}/posts")
  public Map<String, Object> userPosts(
      @PathVariable String username,
      @RequestParam(defaultValue = "0") int includePrivate) {
    Long viewerId = SecurityUtils.currentUserId();
    boolean showPrivate = includePrivate == 1;
    if (showPrivate) {
      User user = postService.findByUsername(username);
      if (user == null || viewerId == null || !user.getId().equals(viewerId)) {
        showPrivate = false;
      }
    }
    return Api.ok("posts", postService.userPosts(username, viewerId, showPrivate));
  }

  @GetMapping("/api/me/favorites")
  public Map<String, Object> favorites() {
    return Api.ok("posts", postService.favorites(SecurityUtils.requireUserId()));
  }

  @GetMapping("/api/stats")
  public Map<String, Object> stats() {
    return Api.ok(postService.stats());
  }

  @GetMapping("/api/tags")
  public Map<String, Object> tags(@RequestParam(defaultValue = "12") int limit) {
    return Api.ok("tags", postService.topTags(limit));
  }

  @GetMapping("/api/categories")
  public Map<String, Object> categories() {
    return Api.ok("categories", postService.categoryCounts());
  }

  @GetMapping("/api/recommended")
  public Map<String, Object> recommended(@RequestParam(defaultValue = "8") int limit) {
    return Api.ok("posts", postService.recommended(SecurityUtils.currentUserId(), limit));
  }
}
