package com.shiguang.blog.ai;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** 启动时把站内已发布文章建立知识库索引。 */
@Component
public class RagInitializer implements ApplicationRunner {
  private final RAGService ragService;

  public RagInitializer(RAGService ragService) {
    this.ragService = ragService;
  }

  @Override
  public void run(ApplicationArguments args) {
    try {
      ragService.ensureIndexed();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
