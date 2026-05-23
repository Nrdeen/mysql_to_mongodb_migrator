/**
 * Enhanced Sample Database Schema for Migration Testing
 * This schema includes various SQL features to demonstrate migration capabilities
 */

-- Create database
CREATE DATABASE IF NOT EXISTS test_migration;
USE test_migration;

-- ============================================================================
-- TABLE DEFINITIONS
-- ============================================================================

-- Users Table
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active),
  CHECK (email LIKE '%@%'),
  CHECK (LENGTH(password_hash) >= 20)
);

-- Profiles Table
CREATE TABLE profiles (
  profile_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url VARCHAR(255),
  country VARCHAR(100),
  city VARCHAR(100),
  timezone VARCHAR(50),
  preferences JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_country (country)
);

-- Posts Table
CREATE TABLE posts (
  post_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content LONGTEXT NOT NULL,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  CHECK (view_count >= 0),
  CHECK (like_count >= 0)
);

-- Comments Table
CREATE TABLE comments (
  comment_id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id),
  UNIQUE KEY unique_comment (post_id, user_id)
);

-- Tags Table
CREATE TABLE tags (
  tag_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  usage_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_slug (slug)
);

-- Post_Tags Association Table
CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE,
  INDEX idx_tag_id (tag_id)
);

-- Likes Table
CREATE TABLE likes (
  like_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  UNIQUE KEY unique_like (user_id, post_id),
  INDEX idx_post_id (post_id)
);

-- Notifications Table
CREATE TABLE notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  related_user_id INT,
  related_post_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (related_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (related_post_id) REFERENCES posts(post_id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active Users View
CREATE VIEW view_active_users AS
SELECT user_id, username, email, first_name, last_name, created_at
FROM users
WHERE is_active = TRUE;

-- Popular Posts View
CREATE VIEW view_popular_posts AS
SELECT 
  p.post_id,
  p.title,
  p.user_id,
  u.username,
  COUNT(DISTINCT l.like_id) as like_count,
  COUNT(DISTINCT c.comment_id) as comment_count,
  p.created_at
FROM posts p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN likes l ON p.post_id = l.post_id
LEFT JOIN comments c ON p.post_id = c.post_id
WHERE p.status = 'published'
GROUP BY p.post_id;

-- User Activity View
CREATE VIEW view_user_activity AS
SELECT 
  u.user_id,
  u.username,
  COUNT(DISTINCT p.post_id) as total_posts,
  COUNT(DISTINCT c.comment_id) as total_comments,
  COUNT(DISTINCT l.like_id) as total_likes,
  MAX(u.last_login) as last_activity
FROM users u
LEFT JOIN posts p ON u.user_id = p.user_id
LEFT JOIN comments c ON u.user_id = c.user_id
LEFT JOIN likes l ON u.user_id = l.user_id
GROUP BY u.user_id;

-- ============================================================================
-- STORED PROCEDURES (Will need to be migrated to application code)
-- ============================================================================

DELIMITER $$

-- Procedure to get user posts with comment count
CREATE PROCEDURE sp_get_user_posts(IN p_user_id INT)
BEGIN
  SELECT 
    p.post_id,
    p.title,
    p.content,
    p.created_at,
    COUNT(c.comment_id) as comment_count
  FROM posts p
  LEFT JOIN comments c ON p.post_id = c.post_id
  WHERE p.user_id = p_user_id
  GROUP BY p.post_id
  ORDER BY p.created_at DESC;
END$$

-- Procedure to create a new user with profile
CREATE PROCEDURE sp_create_user(
  IN p_username VARCHAR(100),
  IN p_email VARCHAR(100),
  IN p_password_hash VARCHAR(255),
  IN p_first_name VARCHAR(50),
  IN p_last_name VARCHAR(50),
  OUT p_user_id INT
)
BEGIN
  INSERT INTO users (username, email, password_hash, first_name, last_name)
  VALUES (p_username, p_email, p_password_hash, p_first_name, p_last_name);
  
  SET p_user_id = LAST_INSERT_ID();
  
  INSERT INTO profiles (user_id) VALUES (p_user_id);
END$$

-- Procedure to get user statistics
CREATE PROCEDURE sp_get_user_stats(IN p_user_id INT)
BEGIN
  SELECT 
    u.user_id,
    u.username,
    COUNT(DISTINCT p.post_id) as total_posts,
    COUNT(DISTINCT c.comment_id) as total_comments,
    COALESCE(SUM(p.like_count), 0) as total_likes_received,
    COUNT(DISTINCT l.like_id) as posts_liked
  FROM users u
  LEFT JOIN posts p ON u.user_id = p.user_id
  LEFT JOIN comments c ON u.user_id = c.user_id
  LEFT JOIN likes l ON u.user_id = l.user_id
  WHERE u.user_id = p_user_id
  GROUP BY u.user_id;
END$$

DELIMITER ;

-- ============================================================================
-- FUNCTIONS (Will need to be migrated to application code)
-- ============================================================================

DELIMITER $$

-- Function to calculate user reputation
CREATE FUNCTION fn_calculate_reputation(p_user_id INT) 
RETURNS INT DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE reputation INT DEFAULT 0;
  
  SELECT 
    COALESCE(COUNT(DISTINCT p.post_id) * 10, 0) +
    COALESCE(COUNT(DISTINCT c.comment_id) * 5, 0) +
    COALESCE(COALESCE(SUM(p.like_count), 0) * 2, 0)
  FROM users u
  LEFT JOIN posts p ON u.user_id = p.user_id
  LEFT JOIN comments c ON u.user_id = c.user_id
  WHERE u.user_id = p_user_id
  INTO reputation;
  
  RETURN COALESCE(reputation, 0);
END$$

-- Function to format timestamp
CREATE FUNCTION fn_format_timestamp(p_timestamp DATETIME)
RETURNS VARCHAR(100) DETERMINISTIC
BEGIN
  RETURN DATE_FORMAT(p_timestamp, '%Y-%m-%d %H:%i:%s');
END$$

DELIMITER ;

-- ============================================================================
-- TRIGGERS (Will need to be migrated to application logic or change streams)
-- ============================================================================

DELIMITER $$

-- Update user's updated_at when profile changes
CREATE TRIGGER trg_update_user_timestamp AFTER UPDATE ON profiles
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = NOW() WHERE user_id = NEW.user_id;
END$$

-- Auto-create notification when post is liked
CREATE TRIGGER trg_notify_on_like AFTER INSERT ON likes
FOR EACH ROW
BEGIN
  DECLARE post_owner_id INT;
  SELECT user_id INTO post_owner_id FROM posts WHERE post_id = NEW.post_id;
  
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, related_user_id, related_post_id)
    VALUES (post_owner_id, 'like', 'New Like', 'Someone liked your post', NEW.user_id, NEW.post_id);
  END IF;
END$$

-- Auto-create notification when comment is posted
CREATE TRIGGER trg_notify_on_comment AFTER INSERT ON comments
FOR EACH ROW
BEGIN
  DECLARE post_owner_id INT;
  SELECT user_id INTO post_owner_id FROM posts WHERE post_id = NEW.post_id;
  
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, related_user_id, related_post_id)
    VALUES (post_owner_id, 'comment', 'New Comment', 'Someone commented on your post', NEW.user_id, NEW.post_id);
  END IF;
END$$

-- Update post like count
CREATE TRIGGER trg_update_post_likes AFTER INSERT ON likes
FOR EACH ROW
BEGIN
  UPDATE posts SET like_count = like_count + 1 WHERE post_id = NEW.post_id;
END$$

CREATE TRIGGER trg_update_post_likes_delete AFTER DELETE ON likes
FOR EACH ROW
BEGIN
  UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE post_id = OLD.post_id;
END$$

DELIMITER ;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_posts_published_at ON posts(published_at);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample users
INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES
('admin_user', 'admin@example.com', 'hashed_password_1234567890123456', 'Admin', 'User', 'admin'),
('john_doe', 'john@example.com', 'hashed_password_1234567890123456', 'John', 'Doe', 'user'),
('jane_smith', 'jane@example.com', 'hashed_password_1234567890123456', 'Jane', 'Smith', 'user'),
('bob_wilson', 'bob@example.com', 'hashed_password_1234567890123456', 'Bob', 'Wilson', 'moderator');

-- Insert sample profiles
INSERT INTO profiles (user_id, bio, country, city) VALUES
(1, 'Administrator', 'USA', 'New York'),
(2, 'Software Developer', 'USA', 'San Francisco'),
(3, 'Data Scientist', 'UK', 'London'),
(4, 'Content Moderator', 'Canada', 'Toronto');

-- Insert sample posts
INSERT INTO posts (user_id, title, content, status, created_at, published_at) VALUES
(2, 'Getting Started with MongoDB', 'MongoDB is a NoSQL database...', 'published', NOW(), NOW()),
(2, 'Advanced MongoDB Queries', 'This post covers advanced aggregation...', 'published', NOW(), NOW()),
(3, 'Data Analysis with Python', 'Python is great for data analysis...', 'published', NOW(), NOW()),
(1, 'Welcome to Our Platform', 'Welcome to our new blogging platform...', 'published', NOW(), NOW());

-- Insert sample tags
INSERT INTO tags (name, slug, description, usage_count) VALUES
('mongodb', 'mongodb', 'MongoDB related posts', 2),
('python', 'python', 'Python programming', 1),
('database', 'database', 'Database related posts', 3),
('tutorial', 'tutorial', 'Tutorial posts', 4);

-- Insert sample post-tag associations
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 3), (1, 4),
(2, 1), (2, 3),
(3, 2), (3, 4),
(4, 4);

-- Insert sample likes
INSERT INTO likes (user_id, post_id) VALUES
(1, 1), (1, 2), (1, 3),
(3, 1), (3, 4),
(4, 2), (4, 3);

-- Insert sample comments
INSERT INTO comments (post_id, user_id, content) VALUES
(1, 3, 'Great post! Very informative.'),
(1, 4, 'Thanks for sharing this knowledge.'),
(2, 3, 'Can you provide more examples?'),
(3, 2, 'Nice analysis!'),
(4, 2, 'Looking forward to more posts.');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'test_migration';

-- View schema with column types
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'test_migration'
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- View relationships
SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'test_migration';
