CREATE DATABASE IF NOT EXISTS shiguang
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shiguang;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  bio VARCHAR(500) NOT NULL DEFAULT '',
  website VARCHAR(200) NOT NULL DEFAULT '',
  avatar_seed VARCHAR(100) NOT NULL DEFAULT '',
  role VARCHAR(10) NOT NULL DEFAULT 'user',
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  author_id BIGINT NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  excerpt VARCHAR(500) NOT NULL DEFAULT '',
  cover_seed VARCHAR(100) NOT NULL DEFAULT '',
  tags VARCHAR(200) NOT NULL DEFAULT '',
  category VARCHAR(30) NOT NULL DEFAULT 'uncategorized',
  status VARCHAR(10) NOT NULL DEFAULT 'draft',
  rejection_reason VARCHAR(500) NOT NULL DEFAULT '',
  views INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  published_at BIGINT,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_posts_status_published (status, published_at),
  INDEX idx_posts_author (author_id),
  INDEX idx_posts_category (category, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS likes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uk_likes_user_post (user_id, post_id),
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_likes_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE KEY uk_bookmarks_user_post (user_id, post_id),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_bookmarks_user (user_id),
  INDEX idx_bookmarks_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'visible',
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_comments_post (post_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  actor_id BIGINT,
  type VARCHAR(10) NOT NULL,
  post_id BIGINT,
  content VARCHAR(500) NOT NULL DEFAULT '',
  `read` TINYINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notifications_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, `read`, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
