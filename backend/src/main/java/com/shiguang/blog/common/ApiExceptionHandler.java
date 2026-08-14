package com.shiguang.blog.common;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 全局异常处理:把业务异常统一转成 {ok: false, error: ...}。 */
@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException e) {
    return ResponseEntity.status(e.getStatus()).body(Map.of("ok", false, "error", e.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException e) {
    FieldError fieldError = e.getBindingResult().getFieldError();
    String message = fieldError != null ? fieldError.getDefaultMessage() : "参数校验失败";
    return ResponseEntity.badRequest().body(Map.of("ok", false, "error", message));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleOther(Exception e) {
    e.printStackTrace();
    return ResponseEntity.status(500)
        .body(Map.of("ok", false, "error", "服务器开小差了，请稍后再试"));
  }
}
