package com.shiguang.blog.common;

/** 业务异常:携带 HTTP 状态码和给前端展示的错误信息。 */
public class ApiException extends RuntimeException {
  private final int status;

  public ApiException(int status, String message) {
    super(message);
    this.status = status;
  }

  public int getStatus() {
    return status;
  }
}
