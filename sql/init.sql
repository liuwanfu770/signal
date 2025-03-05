-- 用户表，用于认证和权限管理-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signal 账号表
CREATE TABLE signal_accounts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    instance_id INTEGER,
    status VARCHAR(20) DEFAULT 'REGISTERED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_phone VARCHAR(20) NOT NULL,
    recipient_phone VARCHAR(20),
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'SENDING',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 群组表
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100),
    creator_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 联系人表
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 账号分组表，用于管理账号分组
CREATE TABLE account_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signal账号表，核心表，用于存储账号信息
CREATE TABLE signal_accounts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    instance_id INTEGER, -- Signal实例ID，可用于多实例管理
    status VARCHAR(20) DEFAULT 'REGISTERED', -- 状态：REGISTERED, ACTIVE, INACTIVE等
    group_id INTEGER REFERENCES account_groups(id),
    last_active TIMESTAMP, -- 最后活跃时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);