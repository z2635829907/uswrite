package com.shiguang.blog.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.shiguang.blog.common.ApiException;
import com.shiguang.blog.dto.LoginRequest;
import com.shiguang.blog.dto.PasswordRequest;
import com.shiguang.blog.dto.ProfileRequest;
import com.shiguang.blog.dto.RegisterRequest;
import com.shiguang.blog.entity.User;
import com.shiguang.blog.mapper.UserMapper;
import com.shiguang.blog.security.JwtUtil;
import com.shiguang.blog.view.UserView;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** 登录注册与账号资料服务。 */
@Service
public class AuthService {
  private final UserMapper userMapper;
  private final PasswordEncoder passwordEncoder;
  private final JwtUtil jwtUtil;

  public AuthService(
      UserMapper userMapper, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
    this.userMapper = userMapper;
    this.passwordEncoder = passwordEncoder;
    this.jwtUtil = jwtUtil;
  }

  public UserView toUserView(User user) {
    return new UserView(
        user.getId(),
        user.getUsername(),
        user.getDisplay_name(),
        user.getBio(),
        user.getWebsite(),
        user.getAvatar_seed(),
        user.getRole(),
        user.getStatus(),
        user.getCreated_at());
  }

  public User requireUser(Long userId) {
    User user = userMapper.selectById(userId);
    if (user == null) {
      throw new ApiException(401, "用户不存在");
    }
    return user;
  }

  public Map<String, Object> register(RegisterRequest req) {
    String username = req.username().trim();
    String email = req.email().trim().toLowerCase();
    String displayName = req.displayName().trim();
    User exists = findByNameOrEmail(username, email);
    if (exists != null) {
      if (exists.getUsername().equals(username)) {
        throw new ApiException(409, "这个用户名已经被使用了");
      }
      throw new ApiException(409, "这个邮箱已经注册过了");
    }
    long now = System.currentTimeMillis();
    User user = new User();
    user.setUsername(username);
    user.setEmail(email);
    user.setPassword_hash(passwordEncoder.encode(req.password()));
    user.setDisplay_name(displayName);
    user.setAvatar_seed(username);
    user.setRole("user");
    user.setStatus("active");
    user.setCreated_at(now);
    user.setUpdated_at(now);
    userMapper.insert(user);
    return Map.of("user", toUserView(user), "token", tokenOf(user));
  }

  public Map<String, Object> login(LoginRequest req) {
    String account = req.account().trim();
    User user = findByNameOrEmail(account, account.toLowerCase());
    if (user == null || !passwordEncoder.matches(req.password(), user.getPassword_hash())) {
      throw new ApiException(401, "用户名或密码不正确");
    }
    if ("banned".equals(user.getStatus())) {
      throw new ApiException(403, "该账号已被禁用，如有疑问请联系管理员");
    }
    return Map.of("user", toUserView(user), "token", tokenOf(user));
  }

  public UserView me(Long userId) {
    return toUserView(requireUser(userId));
  }

  public UserView updateProfile(Long userId, ProfileRequest req) {
    User user = requireUser(userId);
    if (req.displayName() != null && !req.displayName().isBlank()) {
      user.setDisplay_name(req.displayName().trim());
    }
    if (req.bio() != null) {
      user.setBio(req.bio());
    }
    if (req.website() != null) {
      user.setWebsite(req.website());
    }
    if (req.avatarSeed() != null && !req.avatarSeed().isBlank()) {
      user.setAvatar_seed(req.avatarSeed());
    }
    user.setUpdated_at(System.currentTimeMillis());
    userMapper.updateById(user);
    return toUserView(user);
  }

  public void updatePassword(Long userId, PasswordRequest req) {
    User user = requireUser(userId);
    if (!passwordEncoder.matches(req.currentPassword(), user.getPassword_hash())) {
      throw new ApiException(400, "当前密码不正确");
    }
    user.setPassword_hash(passwordEncoder.encode(req.newPassword()));
    user.setUpdated_at(System.currentTimeMillis());
    userMapper.updateById(user);
  }

  private User findByNameOrEmail(String username, String email) {
    return userMapper.selectOne(
        new LambdaQueryWrapper<User>()
            .eq(User::getUsername, username)
            .or()
            .eq(User::getEmail, email));
  }

  private String tokenOf(User user) {
    return jwtUtil.generate(user.getId(), user.getRole(), user.getStatus(), user.getDisplay_name());
  }
}
