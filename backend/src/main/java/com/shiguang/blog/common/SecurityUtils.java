package com.shiguang.blog.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** 从登录状态中取当前用户 id 的工具类。 */
public final class SecurityUtils {
  private SecurityUtils() {}

  /** 未登录返回 null,登录则返回用户 id。 */
  public static Long currentUserId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof Long id) {
      return id;
    }
    return null;
  }

  /** 必须登录,否则抛出 401。 */
  public static Long requireUserId() {
    Long id = currentUserId();
    if (id == null) {
      throw new ApiException(401, "请先登录");
    }
    return id;
  }
}
