package com.shiguang.blog;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.shiguang.blog.mapper")
public class ShiguangBlogApplication {
  public static void main(String[] args) {
    SpringApplication.run(ShiguangBlogApplication.class, args);
  }
}
