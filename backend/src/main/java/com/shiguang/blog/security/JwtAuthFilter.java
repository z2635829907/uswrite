package com.shiguang.blog.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** 从请求头 Authorization: Bearer xxx 中解析 JWT,并写入登录状态。 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtUtil jwtUtil;

  public JwtAuthFilter(JwtUtil jwtUtil) {
    this.jwtUtil = jwtUtil;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        Claims claims = jwtUtil.parse(header.substring(7));
        Long userId = Long.valueOf(claims.getSubject());
        String role = claims.get("role", String.class);
        var authorities =
            List.of(new SimpleGrantedAuthority("ROLE_" + (role == null ? "user" : role)));
        var auth = new UsernamePasswordAuthenticationToken(userId, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (Exception ignored) {
        // token 无效或过期时不写入登录状态,按匿名用户处理
      }
    }
    chain.doFilter(request, response);
  }
}
