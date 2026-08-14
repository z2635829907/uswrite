package com.shiguang.blog.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 后端根路径:打开 http://localhost:8080 时返回服务说明,方便区分前后端。 */
@RestController
public class HomeController {
  @GetMapping("/")
  public Map<String, Object> home() {
    return Map.of(
        "ok", true,
        "service", "拾光博客社区后端 (Spring Boot + MySQL)",
        "frontend", "http://localhost:3000",
        "api", "/api/...");
  }
}
