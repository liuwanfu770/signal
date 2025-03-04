-- 初始化脚本

-- 创建数据库和用户
CREATE USER signal_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE signal_db OWNER signal_user;
GRANT ALL PRIVILEGES ON DATABASE signal_db TO signal_user;

-- 创建用户角色枚举类型
CREATE TYPE user_role AS ENUM ('user', 'admin', 'operator');

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signal 账号表
CREATE TABLE signal_accounts (
    phone_number VARCHAR(20) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    instance_id INTEGER,
    status VARCHAR(20) DEFAULT 'REGISTERED',
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    recipient_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    group_id VARCHAR(50) REFERENCES groups(id),
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('TEXT', 'IMAGE', 'VIDEO', 'FILE')),
    status VARCHAR(20) DEFAULT 'SENDING' CHECK (status IN ('SENDING', 'SENT', 'DELIVERED', 'READ')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 群组表
CREATE TABLE groups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 群组成员表
CREATE TABLE group_members (
  group_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  role VARCHAR(10) NOT NULL,
  status VARCHAR(10) DEFAULT 'JOINED',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES signal_accounts(phone_number)
);

-- 联系人表
CREATE TABLE contacts (
    user_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    contact_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, contact_id)
);

-- 搜索历史表
CREATE TABLE search_history (
    search_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) REFERENCES signal_accounts(phone_number),
    search_query VARCHAR(255),
    search_results JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引提升查询性能
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_signal_accounts_user_id ON signal_accounts(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_group_id ON messages(group_id);
