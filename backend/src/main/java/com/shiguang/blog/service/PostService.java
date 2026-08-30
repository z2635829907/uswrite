package com.shiguang.blog.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.shiguang.blog.common.ApiException;
import com.shiguang.blog.ai.RAGService;
import com.shiguang.blog.dto.PostRequest;
import com.shiguang.blog.entity.Bookmark;
import com.shiguang.blog.entity.Comment;
import com.shiguang.blog.entity.Like;
import com.shiguang.blog.entity.Post;
import com.shiguang.blog.entity.User;
import com.shiguang.blog.mapper.BookmarkMapper;
import com.shiguang.blog.mapper.CommentMapper;
import com.shiguang.blog.mapper.LikeMapper;
import com.shiguang.blog.mapper.PostMapper;
import com.shiguang.blog.mapper.UserMapper;
import com.shiguang.blog.view.CommentView;
import com.shiguang.blog.view.PostView;
import com.shiguang.blog.view.UserView;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** 文章、评论、点赞、收藏、统计、推荐等服务。 */
@Service
public class PostService {
  private static final Pattern TAG_SPLIT = Pattern.compile("[,，、\\s]+");
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final List<Map<String, String>> CATEGORIES =
      List.of(
          Map.of("key", "travel", "label", "旅行", "emoji", "✈️"),
          Map.of("key", "life", "label", "生活", "emoji", "🌻"),
          Map.of("key", "emotion", "label", "情感", "emoji", "💌"),
          Map.of("key", "food", "label", "美食", "emoji", "🍜"),
          Map.of("key", "sports", "label", "体育", "emoji", "⚽"),
          Map.of("key", "entertainment", "label", "娱乐", "emoji", "🎬"),
          Map.of("key", "game", "label", "游戏", "emoji", "🎮"));

  private final PostMapper postMapper;
  private final UserMapper userMapper;
  private final LikeMapper likeMapper;
  private final BookmarkMapper bookmarkMapper;
  private final CommentMapper commentMapper;
  private final NotificationService notificationService;
  private final RAGService ragService;

  public PostService(
      PostMapper postMapper,
      UserMapper userMapper,
      LikeMapper likeMapper,
      BookmarkMapper bookmarkMapper,
      CommentMapper commentMapper,
      NotificationService notificationService,
      RAGService ragService) {
    this.postMapper = postMapper;
    this.userMapper = userMapper;
    this.likeMapper = likeMapper;
    this.bookmarkMapper = bookmarkMapper;
    this.commentMapper = commentMapper;
    this.notificationService = notificationService;
    this.ragService = ragService;
  }

  public static List<String> parseTags(String tags) {
    if (tags == null || tags.isBlank()) {
      return List.of();
    }
    return java.util.Arrays.stream(TAG_SPLIT.split(tags))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .limit(5)
        .toList();
  }

  private static String randomSlug() {
    return Long.toString(System.currentTimeMillis(), 36)
        + "-"
        + Integer.toHexString(RANDOM.nextInt(0x10000));
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

  /** 把文章实体组装成前端需要的完整视图(作者、点赞数、评论数、是否点赞/收藏)。 */
  public List<PostView> toViews(List<Post> posts, Long viewerId) {
    if (posts.isEmpty()) {
      return List.of();
    }
    List<Long> ids = posts.stream().map(Post::getId).toList();
    List<Long> authorIds =
        posts.stream().map(Post::getAuthor_id).distinct().toList();
    Map<Long, User> users =
        userMapper.selectBatchIds(authorIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
    Map<Long, Long> likeCounts = countByPost(likeMapper.selectList(
        new LambdaQueryWrapper<Like>().in(Like::getPost_id, ids)));
    Map<Long, Long> commentCounts = countByPostComment(commentMapper.selectList(
        new LambdaQueryWrapper<Comment>().in(Comment::getPost_id, ids)));
    Set<Long> liked = new HashSet<>();
    Set<Long> bookmarked = new HashSet<>();
    if (viewerId != null) {
      liked =
          likeMapper
              .selectList(
                  new LambdaQueryWrapper<Like>()
                      .eq(Like::getUser_id, viewerId)
                      .in(Like::getPost_id, ids))
              .stream()
              .map(Like::getPost_id)
              .collect(Collectors.toSet());
      bookmarked =
          bookmarkMapper
              .selectList(
                  new LambdaQueryWrapper<Bookmark>()
                      .eq(Bookmark::getUser_id, viewerId)
                      .in(Bookmark::getPost_id, ids))
              .stream()
              .map(Bookmark::getPost_id)
              .collect(Collectors.toSet());
    }
    List<PostView> result = new ArrayList<>();
    for (Post post : posts) {
      PostView v = new PostView();
      copyPost(post, v);
      v.setTagsList(parseTags(post.getTags()));
      v.setLike_count(likeCounts.getOrDefault(post.getId(), 0L));
      v.setComment_count(commentCounts.getOrDefault(post.getId(), 0L));
      v.setLiked_by_me(liked.contains(post.getId()));
      v.setBookmarked_by_me(bookmarked.contains(post.getId()));
      User author = users.get(post.getAuthor_id());
      if (author != null) {
        v.setAuthor(toUserView(author));
      }
      result.add(v);
    }
    return result;
  }

  private void copyPost(Post post, PostView view) {
    view.setId(post.getId());
    view.setAuthor_id(post.getAuthor_id());
    view.setSlug(post.getSlug());
    view.setTitle(post.getTitle());
    view.setContent(post.getContent());
    view.setExcerpt(post.getExcerpt());
    view.setCover_seed(post.getCover_seed());
    view.setTags(post.getTags());
    view.setCategory(post.getCategory());
    view.setStatus(post.getStatus());
    view.setRejection_reason(post.getRejection_reason());
    view.setViews(post.getViews());
    view.setCreated_at(post.getCreated_at());
    view.setUpdated_at(post.getUpdated_at());
    view.setPublished_at(post.getPublished_at());
  }

  private Map<Long, Long> countByPost(List<Like> likes) {
    return likes.stream().collect(Collectors.groupingBy(Like::getPost_id, Collectors.counting()));
  }

  private Map<Long, Long> countByPostComment(List<Comment> comments) {
    return comments.stream()
        .collect(Collectors.groupingBy(Comment::getPost_id, Collectors.counting()));
  }

  public Map<String, Object> list(
      String tag,
      String category,
      String q,
      String sort,
      int page,
      int pageSize,
      Long viewerId) {
    LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(Post::getStatus, "approved");
    if (tag != null && !tag.isBlank()) {
      wrapper.apply("FIND_IN_SET({0}, REPLACE(tags, '，', ','))", tag);
    }
    if (category != null && !category.isBlank()) {
      wrapper.eq(Post::getCategory, category);
    }
    if (q != null && !q.isBlank()) {
      wrapper.and(
          w ->
              w.like(Post::getTitle, q)
                  .or()
                  .like(Post::getExcerpt, q)
                  .or()
                  .like(Post::getContent, q));
    }
    wrapper.orderByDesc(Post::getPublished_at);
    Page<Post> p = postMapper.selectPage(new Page<>(page, pageSize), wrapper);
    List<PostView> views = toViews(p.getRecords(), viewerId);
    if ("hot".equals(sort)) {
      views.sort(
          Comparator.comparing(PostView::getLike_count)
              .thenComparing(PostView::getPublished_at, Comparator.nullsLast(Comparator.reverseOrder()))
              .reversed());
    }
    return Map.of("posts", views, "total", p.getTotal(), "page", p.getCurrent(), "pageSize", p.getSize());
  }

  public PostView getBySlug(String slug, Long viewerId) {
    Post post =
        postMapper.selectOne(new LambdaQueryWrapper<Post>().eq(Post::getSlug, slug));
    if (post == null) {
      throw new ApiException(404, "文章不存在");
    }
    requireViewable(post, viewerId);
    return toViews(List.of(post), viewerId).get(0);
  }

  public PostView getById(Long id, Long viewerId) {
    Post post = postMapper.selectById(id);
    if (post == null) {
      throw new ApiException(404, "文章不存在");
    }
    requireViewable(post, viewerId);
    return toViews(List.of(post), viewerId).get(0);
  }

  private void requireViewable(Post post, Long viewerId) {
    if ("approved".equals(post.getStatus())) {
      return;
    }
    boolean owner = viewerId != null && viewerId.equals(post.getAuthor_id());
    boolean admin = viewerId != null && isAdmin(viewerId);
    if (!owner && !admin) {
      throw new ApiException(404, "文章不存在");
    }
  }

  private boolean isAdmin(Long userId) {
    User user = userMapper.selectById(userId);
    return user != null && "admin".equals(user.getRole());
  }

  public Map<String, Object> create(Long userId, PostRequest req) {
    String title = req.title().trim();
    String content = req.content().trim();
    String status = "submit".equals(req.action()) ? "pending" : "draft";
    if ("pending".equals(status) && content.length() < 50) {
      throw new ApiException(400, "正文内容太短了，至少写 50 个字再提交审核");
    }
    long now = System.currentTimeMillis();
    Post post = new Post();
    post.setAuthor_id(userId);
    post.setSlug(randomSlug());
    post.setTitle(title);
    post.setContent(content);
    post.setExcerpt(req.excerpt().trim());
    post.setTags(String.join(",", parseTags(req.tags())));
    post.setCover_seed(req.coverSeed().trim().isEmpty() ? title.substring(0, Math.min(20, title.length())) : req.coverSeed().trim());
    post.setCategory(req.category());
    post.setStatus(status);
    post.setRejection_reason("");
    post.setViews(0);
    post.setCreated_at(now);
    post.setUpdated_at(now);
    postMapper.insert(post);
    return Map.of("id", post.getId(), "slug", post.getSlug(), "status", post.getStatus());
  }

  public Map<String, Object> update(Long userId, Long postId, PostRequest req) {
    Post post = postMapper.selectById(postId);
    if (post == null) {
      throw new ApiException(404, "文章不存在");
    }
    if (!post.getAuthor_id().equals(userId)) {
      throw new ApiException(403, "只能编辑自己的文章");
    }
    String title = req.title().trim();
    String content = req.content().trim();
    String status = post.getStatus();
    if ("submit".equals(req.action())) {
      if (content.length() < 50) {
        throw new ApiException(400, "正文内容太短了，至少写 50 个字再提交审核");
      }
      if ("draft".equals(status) || "rejected".equals(status)) {
        status = "pending";
      }
    }
    post.setTitle(title);
    post.setContent(content);
    post.setExcerpt(req.excerpt().trim());
    post.setTags(String.join(",", parseTags(req.tags())));
    post.setCover_seed(req.coverSeed().trim().isEmpty() ? title.substring(0, Math.min(20, title.length())) : req.coverSeed().trim());
    post.setCategory(req.category());
    post.setStatus(status);
    post.setRejection_reason("");
    post.setUpdated_at(System.currentTimeMillis());
    postMapper.updateById(post);
    ragService.syncPost(post);
    return Map.of("status", post.getStatus());
  }

  public void delete(Long userId, Long postId) {
    Post post = postMapper.selectById(postId);
    if (post == null) {
      throw new ApiException(404, "文章不存在");
    }
    if (!post.getAuthor_id().equals(userId) && !isAdmin(userId)) {
      throw new ApiException(403, "没有权限删除这篇文章");
    }
    postMapper.deleteById(postId);
    ragService.removePost(postId);
  }

  public Map<String, Object> toggleLike(Long userId, Long postId) {
    Post post = postMapper.selectById(postId);
    if (post == null || (!"approved".equals(post.getStatus()) && !post.getAuthor_id().equals(userId))) {
      throw new ApiException(404, "文章不存在");
    }
    Like existing =
        likeMapper.selectOne(
            new LambdaQueryWrapper<Like>()
                .eq(Like::getUser_id, userId)
                .eq(Like::getPost_id, postId));
    boolean liked;
    if (existing != null) {
      likeMapper.deleteById(existing.getId());
      liked = false;
    } else {
      Like like = new Like();
      like.setUser_id(userId);
      like.setPost_id(postId);
      like.setCreated_at(System.currentTimeMillis());
      likeMapper.insert(like);
      liked = true;
      if (!post.getAuthor_id().equals(userId)) {
        User me = userMapper.selectById(userId);
        notificationService.create(
            post.getAuthor_id(),
            userId,
            "like",
            postId,
            me.getDisplay_name() + " 赞了你的文章");
      }
    }
    long count = likeMapper.selectCount(new LambdaQueryWrapper<Like>().eq(Like::getPost_id, postId));
    return Map.of("liked", liked, "count", count);
  }

  public Map<String, Object> toggleBookmark(Long userId, Long postId) {
    Post post =
        postMapper.selectOne(
            new LambdaQueryWrapper<Post>()
                .eq(Post::getId, postId)
                .eq(Post::getStatus, "approved"));
    if (post == null) {
      throw new ApiException(404, "文章不存在");
    }
    Bookmark existing =
        bookmarkMapper.selectOne(
            new LambdaQueryWrapper<Bookmark>()
                .eq(Bookmark::getUser_id, userId)
                .eq(Bookmark::getPost_id, postId));
    if (existing != null) {
      bookmarkMapper.deleteById(existing.getId());
      return Map.of("bookmarked", false);
    }
    Bookmark bookmark = new Bookmark();
    bookmark.setUser_id(userId);
    bookmark.setPost_id(postId);
    bookmark.setCreated_at(System.currentTimeMillis());
    bookmarkMapper.insert(bookmark);
    return Map.of("bookmarked", true);
  }

  public void incrementViews(Long postId) {
    postMapper.update(
        null,
        new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<Post>()
            .eq(Post::getId, postId)
            .eq(Post::getStatus, "approved")
            .setSql("views = views + 1"));
  }

  public List<CommentView> listComments(Long postId) {
    List<Comment> comments =
        commentMapper.selectList(
            new LambdaQueryWrapper<Comment>()
                .eq(Comment::getPost_id, postId)
                .eq(Comment::getStatus, "visible")
                .orderByAsc(Comment::getCreated_at));
    if (comments.isEmpty()) {
      return List.of();
    }
    List<Long> userIds = comments.stream().map(Comment::getUser_id).distinct().toList();
    Map<Long, User> users =
        userMapper.selectBatchIds(userIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
    return comments.stream()
        .map(
            c -> {
              CommentView v = new CommentView();
              v.setId(c.getId());
              v.setPost_id(c.getPost_id());
              v.setUser_id(c.getUser_id());
              v.setContent(c.getContent());
              v.setStatus(c.getStatus());
              v.setCreated_at(c.getCreated_at());
              User author = users.get(c.getUser_id());
              if (author != null) {
                v.setAuthor(toUserView(author));
              }
              return v;
            })
        .toList();
  }

  public Map<String, Object> addComment(Long userId, Long postId, String content) {
    Post post =
        postMapper.selectOne(
            new LambdaQueryWrapper<Post>()
                .eq(Post::getId, postId)
                .eq(Post::getStatus, "approved"));
    if (post == null) {
      throw new ApiException(404, "文章不存在");
    }
    User me = userMapper.selectById(userId);
    long now = System.currentTimeMillis();
    Comment comment = new Comment();
    comment.setPost_id(postId);
    comment.setUser_id(userId);
    comment.setContent(content.trim());
    comment.setStatus("visible");
    comment.setCreated_at(now);
    commentMapper.insert(comment);
    if (!post.getAuthor_id().equals(userId)) {
      notificationService.create(
          post.getAuthor_id(),
          userId,
          "comment",
          postId,
          me.getDisplay_name() + " 评论了《" + post.getTitle() + "》");
    }
    Map<String, Object> author =
        Map.of(
            "id", me.getId(),
            "username", me.getUsername(),
            "display_name", me.getDisplay_name(),
            "avatar_seed", me.getAvatar_seed());
    Map<String, Object> commentJson =
        Map.of(
            "id", comment.getId(),
            "content", comment.getContent(),
            "created_at", now,
            "author", author);
    return Map.of("comment", commentJson);
  }

  public List<PostView> userPosts(String username, Long viewerId, boolean includePrivate) {
    User user = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
    if (user == null) {
      return List.of();
    }
    LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(Post::getAuthor_id, user.getId());
    if (includePrivate) {
      wrapper.in(Post::getStatus, "draft", "pending", "approved", "rejected");
    } else {
      wrapper.eq(Post::getStatus, "approved");
    }
    wrapper.orderByDesc(Post::getPublished_at).orderByDesc(Post::getCreated_at);
    return toViews(postMapper.selectList(wrapper), viewerId);
  }

  public List<PostView> favorites(Long userId) {
    List<Bookmark> marks =
        bookmarkMapper.selectList(
            new LambdaQueryWrapper<Bookmark>()
                .eq(Bookmark::getUser_id, userId)
                .orderByDesc(Bookmark::getCreated_at));
    if (marks.isEmpty()) {
      return List.of();
    }
    List<Long> ids = marks.stream().map(Bookmark::getPost_id).toList();
    List<Post> posts =
        postMapper.selectBatchIds(ids).stream()
            .filter(p -> "approved".equals(p.getStatus()))
            .toList();
    return toViews(posts, userId);
  }

  public List<PostView> related(Long postId, Long viewerId, int limit) {
    Post post = postMapper.selectById(postId);
    if (post == null) {
      return List.of();
    }
    List<Post> candidates =
        postMapper.selectList(
            new LambdaQueryWrapper<Post>()
                .eq(Post::getStatus, "approved")
                .ne(Post::getId, postId));
    List<String> tags = parseTags(post.getTags());
    if (tags.isEmpty()) {
      return List.of();
    }
    List<Post> related =
        candidates.stream()
            .filter(p -> parseTags(p.getTags()).stream().anyMatch(tags::contains))
            .limit(limit)
            .toList();
    return toViews(related, viewerId);
  }

  public List<Map<String, Object>> categoryCounts() {
    List<Post> posts =
        postMapper.selectList(
            new LambdaQueryWrapper<Post>()
                .eq(Post::getStatus, "approved")
                .select(Post::getCategory));
    Map<String, Long> counts = new HashMap<>();
    for (Post post : posts) {
      String key =
          post.getCategory() == null || post.getCategory().isBlank()
              ? "uncategorized"
              : post.getCategory();
      counts.merge(key, 1L, Long::sum);
    }
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, String> c : CATEGORIES) {
      result.add(
          Map.of(
              "key", c.get("key"),
              "label", c.get("label"),
              "emoji", c.get("emoji"),
              "count", counts.getOrDefault(c.get("key"), 0L)));
    }
    result.add(
        Map.of(
            "key", "uncategorized",
            "label", "未分类",
            "emoji", "📂",
            "count", counts.getOrDefault("uncategorized", 0L)));
    return result;
  }

  public void deleteComment(Long userId, Long commentId) {
    Comment comment = commentMapper.selectById(commentId);
    if (comment == null) {
      throw new ApiException(404, "评论不存在");
    }
    Post post = postMapper.selectById(comment.getPost_id());
    boolean canDelete =
        comment.getUser_id().equals(userId)
            || isAdmin(userId)
            || (post != null && post.getAuthor_id().equals(userId));
    if (!canDelete) {
      throw new ApiException(403, "没有权限删除这条评论");
    }
    commentMapper.deleteById(commentId);
  }

  public List<PostView> recommended(Long viewerId, int limit) {
    List<Post> posts =
        postMapper.selectList(new LambdaQueryWrapper<Post>().eq(Post::getStatus, "approved"));
    List<PostView> views = toViews(posts, viewerId);
    long now = System.currentTimeMillis();
    views.sort(Comparator.comparingDouble((PostView v) -> score(v, now)).reversed());
    return views.stream().limit(limit).toList();
  }

  private double score(PostView v, long now) {
    double ageDays =
        v.getPublished_at() == null ? 365 : (now - v.getPublished_at()) / 86400000.0;
    double recency = Math.max(0, (30 - ageDays) / 30.0) * 8;
    return v.getLike_count() * 3 + v.getComment_count() * 4 + v.getViews() * 0.2 + recency;
  }

  public List<Map<String, Object>> topTags(int limit) {
    List<Post> posts =
        postMapper.selectList(
            new LambdaQueryWrapper<Post>().eq(Post::getStatus, "approved").select(Post::getTags));
    Map<String, Integer> counts = new HashMap<>();
    for (Post post : posts) {
      for (String tag : parseTags(post.getTags())) {
        counts.merge(tag, 1, Integer::sum);
      }
    }
    return counts.entrySet().stream()
        .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
        .limit(limit)
        .map(e -> Map.<String, Object>of("name", e.getKey(), "count", e.getValue()))
        .toList();
  }

  public Map<String, Long> stats() {
    long users = userMapper.selectCount(null);
    long posts =
        postMapper.selectCount(new LambdaQueryWrapper<Post>().eq(Post::getStatus, "approved"));
    long likes = likeMapper.selectCount(null);
    long comments =
        commentMapper.selectCount(new LambdaQueryWrapper<Comment>().eq(Comment::getStatus, "visible"));
    return Map.of("users", users, "posts", posts, "likes", likes, "comments", comments);
  }

  public User findByUsername(String username) {
    return userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
  }
}
