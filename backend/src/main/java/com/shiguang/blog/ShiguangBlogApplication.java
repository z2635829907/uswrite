package com.shiguang.blog;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.shiguang.blog.mapper")
public class ShiguangBlogApplication {
  public static void main(String[] args) {
    SpringApplication.run(ShiguangBlogApplication.class, args);
  }
}
