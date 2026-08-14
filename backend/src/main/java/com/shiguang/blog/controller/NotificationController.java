package com.shiguang.blog.controller;

import com.shiguang.blog.common.Api;
import com.shiguang.blog.common.SecurityUtils;
import com.shiguang.blog.service.NotificationService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 通知接口。 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationService notificationService;

  public NotificationController(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  @GetMapping
  public Map<String, Object> list(@RequestParam(defaultValue = "30") int limit) {
    Long userId = SecurityUtils.requireUserId();
    return Api.ok(
        "notifications", notificationService.list(userId, limit),
        "unread", notificationService.unreadCount(userId));
  }

  @GetMapping("/unread-count")
  public Map<String, Object> unreadCount() {
    return Api.ok("unread", notificationService.unreadCount(SecurityUtils.requireUserId()));
  }

  @PostMapping("/read-all")
  public Map<String, Object> readAll() {
    notificationService.readAll(SecurityUtils.requireUserId());
    return Api.ok();
  }
}
