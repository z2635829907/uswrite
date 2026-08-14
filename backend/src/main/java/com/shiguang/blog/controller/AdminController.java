package com.shiguang.blog.controller;

import com.shiguang.blog.common.Api;
import com.shiguang.blog.common.SecurityUtils;
import com.shiguang.blog.dto.ReviewRequest;
import com.shiguang.blog.dto.RoleRequest;
import com.shiguang.blog.dto.StatusRequest;
import com.shiguang.blog.service.AdminService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 后台管理接口。 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final AdminService adminService;

  public AdminController(AdminService adminService) {
    this.adminService = adminService;
  }

  @GetMapping("/overview")
  public Map<String, Object> overview() {
    Long adminId = SecurityUtils.requireUserId();
    adminService.requireAdmin(adminId);
    return Api.ok(adminService.overview());
  }

  @GetMapping("/posts")
  public Map<String, Object> posts(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int pageSize) {
    Long adminId = SecurityUtils.requireUserId();
    adminService.requireAdmin(adminId);
    return Api.ok(adminService.listPosts(status, category, q, page, pageSize));
  }

  @PostMapping("/posts/{id}/review")
  public Map<String, Object> review(
      @PathVariable Long id, @Valid @RequestBody ReviewRequest req) {
    adminService.review(SecurityUtils.requireUserId(), id, req.decision(), req.reason());
    return Api.ok();
  }

  @GetMapping("/users")
  public Map<String, Object> users(@RequestParam(required = false) String q) {
    Long adminId = SecurityUtils.requireUserId();
    adminService.requireAdmin(adminId);
    return Api.ok("users", adminService.listUsers(q));
  }

  @PatchMapping("/users/{id}/role")
  public Map<String, Object> updateRole(
      @PathVariable Long id, @Valid @RequestBody RoleRequest req) {
    adminService.updateRole(SecurityUtils.requireUserId(), id, req.role());
    return Api.ok();
  }

  @PatchMapping("/users/{id}/status")
  public Map<String, Object> updateStatus(
      @PathVariable Long id, @Valid @RequestBody StatusRequest req) {
    adminService.updateStatus(SecurityUtils.requireUserId(), id, req.status());
    return Api.ok();
  }

  @GetMapping("/comments")
  public Map<String, Object> comments() {
    Long adminId = SecurityUtils.requireUserId();
    adminService.requireAdmin(adminId);
    return Api.ok("comments", adminService.listComments());
  }

  @DeleteMapping("/comments/{id}")
  public Map<String, Object> deleteComment(@PathVariable Long id) {
    adminService.deleteComment(SecurityUtils.requireUserId(), id);
    return Api.ok();
  }
}
