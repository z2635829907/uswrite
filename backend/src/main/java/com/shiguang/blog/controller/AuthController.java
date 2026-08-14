package com.shiguang.blog.controller;

import com.shiguang.blog.common.Api;
import com.shiguang.blog.common.SecurityUtils;
import com.shiguang.blog.dto.LoginRequest;
import com.shiguang.blog.dto.PasswordRequest;
import com.shiguang.blog.dto.ProfileRequest;
import com.shiguang.blog.dto.RegisterRequest;
import com.shiguang.blog.service.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 登录注册与账号接口。 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  public Map<String, Object> register(@Valid @RequestBody RegisterRequest req) {
    return Api.ok(authService.register(req));
  }

  @PostMapping("/login")
  public Map<String, Object> login(@Valid @RequestBody LoginRequest req) {
    return Api.ok(authService.login(req));
  }

  @GetMapping("/me")
  public Map<String, Object> me() {
    return Api.ok("user", authService.me(SecurityUtils.requireUserId()));
  }

  @PatchMapping("/profile")
  public Map<String, Object> updateProfile(@Valid @RequestBody ProfileRequest req) {
    return Api.ok("user", authService.updateProfile(SecurityUtils.requireUserId(), req));
  }

  @PatchMapping("/password")
  public Map<String, Object> updatePassword(@Valid @RequestBody PasswordRequest req) {
    authService.updatePassword(SecurityUtils.requireUserId(), req);
    return Api.ok();
  }
}
