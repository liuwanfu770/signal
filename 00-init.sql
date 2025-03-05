CREATE DATABASE signal_db;
CREATE USER signal_user WITH ENCRYPTED PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE signal_db TO signal_user;

-- 创建 signal_accounts 表
CREATE TABLE signal_accounts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- 创建 users 表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);
