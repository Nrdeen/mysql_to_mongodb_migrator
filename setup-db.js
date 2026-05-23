const mysql = require('mysql2/promise');
require('dotenv').config();

const setupDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('🔧 Setting up MySQL database...');

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ users table created');

    // Create posts table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (userId),
        INDEX idx_status (status),
        INDEX idx_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ posts table created');

    // Create envelopes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS envelopes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        EId VARCHAR(128) NOT NULL UNIQUE,
        ETId VARCHAR(100) NOT NULL,
        SV INT NOT NULL,
        ORGId VARCHAR(64) NOT NULL,
        ES INT NOT NULL,
        CreatedAt BIGINT NOT NULL,
        OrderNumber BIGINT NOT NULL,
        Data LONGTEXT,
        DH VARCHAR(128),
        FH VARCHAR(128),
        SL VARCHAR(255),
        INDEX idx_eid (EId),
        INDEX idx_es (ES),
        INDEX idx_org (ORGId),
        INDEX idx_created (CreatedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ envelopes table created');

    // Create categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ categories table created');

    // Create post_categories junction table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS post_categories (
        postId INT NOT NULL,
        categoryId INT NOT NULL,
        PRIMARY KEY (postId, categoryId),
        FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
        INDEX idx_post (postId),
        INDEX idx_category (categoryId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ post_categories table created');

    console.log('✨ Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

setupDatabase();
