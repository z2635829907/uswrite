package com.shiguang.blog.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.shiguang.blog.entity.Notification;
import com.shiguang.blog.entity.Post;
import com.shiguang.blog.entity.User;
import com.shiguang.blog.mapper.NotificationMapper;
import com.shiguang.blog.mapper.PostMapper;
import com.shiguang.blog.mapper.UserMapper;
import com.shiguang.blog.view.NotificationView;
import com.shiguang.blog.view.UserView;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** 通知服务:新增、查询、已读。 */
@Service
public class NotificationService {
  private final NotificationMapper notificationMapper;
  private final UserMapper userMapper;
  private final PostMapper postMapper;

  public NotificationService(
      NotificationMapper notificationMapper, UserMapper userMapper, PostMapper postMapper) {
    this.notificationMapper = notificationMapper;
    this.userMapper = userMapper;
    this.postMapper = postMapper;
  }

  /** 给某位用户创建一条通知。 */
  public void create(
      Long targetUserId, Long actorId, String type, Long postId, String content) {
    Notification n = new Notification();
    n.setUser_id(targetUserId);
    n.setActor_id(actorId);
    n.setType(type);
    n.setPost_id(postId);
    n.setContent(content);
    n.setRead(0);
    n.setCreated_at(System.currentTimeMillis());
    notificationMapper.insert(n);
  }

  public List<NotificationView> list(Long userId, int limit) {
    List<Notification> rows =
        notificationMapper.selectList(
            new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUser_id, userId)
                .orderByDesc(Notification::getCreated_at)
                .last("LIMIT " + limit));
    if (rows.isEmpty()) {
      return List.of();
    }
    List<Long> actorIds =
        rows.stream().map(Notification::getActor_id).filter(java.util.Objects::nonNull).distinct().toList();
    List<Long> postIds =
        rows.stream().map(Notification::getPost_id).filter(java.util.Objects::nonNull).distinct().toList();
    Map<Long, User> users =
        actorIds.isEmpty()
            ? Map.of()
            : userMapper.selectBatchIds(actorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    Map<Long, Post> posts =
        postIds.isEmpty()
            ? Map.of()
            : postMapper.selectBatchIds(postIds).stream()
                .collect(Collectors.toMap(Post::getId, Function.identity()));

    return rows.stream()
        .map(
            n -> {
              NotificationView v = new NotificationView();
              v.setId(n.getId());
              v.setUser_id(n.getUser_id());
              v.setActor_id(n.getActor_id());
              v.setType(n.getType());
              v.setPost_id(n.getPost_id());
              v.setContent(n.getContent());
              v.setRead(n.getRead());
              v.setCreated_at(n.getCreated_at());
              User actor = users.get(n.getActor_id());
              if (actor != null) {
                v.setActor(new UserView(actor.getId(), actor.getUsername(), actor.getDisplay_name(),
                    actor.getBio(), actor.getWebsite(), actor.getAvatar_seed(), actor.getRole(),
                    actor.getCreated_at()));
              }
              Post post = posts.get(n.getPost_id());
              if (post != null) {
                v.setPost_slug(post.getSlug());
                v.setPost_title(post.getTitle());
              }
              return v;
            })
        .toList();
  }

  public long unreadCount(Long userId) {
    return notificationMapper.selectCount(
        new LambdaQueryWrapper<Notification>()
            .eq(Notification::getUser_id, userId)
            .eq(Notification::getRead, 0));
  }

  public void readAll(Long userId) {
    List<Notification> unread =
        notificationMapper.selectList(
            new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUser_id, userId)
                .eq(Notification::getRead, 0));
    for (Notification n : unread) {
      n.setRead(1);
      notificationMapper.updateById(n);
    }
  }
}
