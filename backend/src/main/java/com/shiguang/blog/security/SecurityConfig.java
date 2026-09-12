package com.shiguang.blog.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/** 安全配置:接口按路径放行,其余需要登录,token 校验通过 JWT 过滤器完成。 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {
  private final JwtAuthFilter jwtAuthFilter;
  private final ObjectMapper objectMapper;

  public SecurityConfig(JwtAuthFilter jwtAuthFilter, ObjectMapper objectMapper) {
    this.jwtAuthFilter = jwtAuthFilter;
    this.objectMapper = objectMapper;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  /** 统一写出 {ok:false,error:...},避免 Security 返回 Spring 原生错误结构。 */
  private void writeError(HttpServletResponse response, int status, String message)
      throws java.io.IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    objectMapper.writeValue(response.getWriter(), Map.of("ok", false, "error", message));
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/", "/error").permitAll()
                    .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/posts/*/view").permitAll()
                    .requestMatchers(
                            HttpMethod.POST,
                            "/api/assistant/chat",
                            "/api/assistant/chat/stream")
                        .permitAll()
                    .requestMatchers(
                            HttpMethod.GET,
                            "/api/stats",
                            "/api/tags",
                            "/api/categories",
                            "/api/recommended",
                            "/api/users/**")
                        .permitAll()
                    .anyRequest()
                        .authenticated())
        .exceptionHandling(
            ex ->
                ex.authenticationEntryPoint(
                        (req, res, e) -> writeError(res, 401, "请先登录"))
                    .accessDeniedHandler(
                        (req, res, e) -> writeError(res, 403, "没有权限执行此操作")))
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }
}
