package com.shiguang.blog.common;

import java.util.LinkedHashMap;
import java.util.Map;

/** 统一成功响应包装:{ok: true, ...数据}。 */
public final class Api {
  private Api() {}

  public static Map<String, Object> ok(Object... keyValues) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("ok", true);
    if (keyValues.length == 1 && keyValues[0] instanceof Map<?, ?> map) {
      map.forEach((k, v) -> body.put(String.valueOf(k), v));
      return body;
    }
    for (int i = 0; i + 1 < keyValues.length; i += 2) {
      body.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
    }
    return body;
  }
}
