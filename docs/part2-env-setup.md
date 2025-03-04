# 《Signal-CLI 多账号管理系统》实施指南 - 第二部分：环境搭建与基础框架

本部分专注于环境搭建、基础框架构建以及账号管理功能的初步实现，确保系统能够在服务器上顺利运行。优化后的内容将具备更高的安全性、更清晰的说明和更健壮的代码逻辑。

### 1. 环境准备

#### 1.1 服务器配置
- **服务器**：推荐使用阿里云海外版 ECS，配置建议为 2核4G，SSD 磁盘，操作系统为 Ubuntu 20.04。
- **域名**：注册一个域名（如 signal-api.yourdomain.com），通过 DNS 解析指向服务器公网 IP。
- **SSL 证书**：后续使用 Let’s Encrypt 获取免费 SSL 证书，通过 Nginx 配置 HTTPS。

#### 安全性加固：
- **更新系统补丁**：定期更新系统以修补安全漏洞。
- **防火墙配置**：使用 UFW 限制端口访问，仅开放必要端口。
- **SSH 安全**：禁用密码登录，使用 SSH 密钥认证，并更改默认端口。

示例命令:
```bash
ssh ubuntu@<your-server-ip>  # 登录服务器（替换 <your-server-ip> 为实际 IP）
sudo apt update && sudo apt upgrade -y  # 更新系统
sudo apt install -y ufw  # 安装和配置防火墙 (UFW)
sudo ufw allow 22/tcp  # SSH 默认端口，后续可更改为自定义端口
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL（仅限本地访问，建议远程关闭）
sudo ufw enable
sudo ufw status
sudo nano /etc/ssh/sshd_config  # 配置 SSH 安全（强烈推荐）
# 修改以下内容：
#   Port 2222  # 更改默认端口，例如 2222
#   PermitRootLogin no  # 禁止 root 登录
#   PasswordAuthentication no  # 禁用密码登录
sudo systemctl restart sshd
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"  # 在本地生成 SSH 密钥对
ssh-copy-id -i ~/.ssh/id_rsa.pub -p 2222 ubuntu@<your-server-ip>  # 将公钥上传到服务器（假设端口改为 2222）
```

### 1.2 安装基本工具
```bash
sudo apt install -y git curl  # 安装基本工具
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -  # 安装 Node.js 18.x LTS（长期支持版本）
sudo apt install -y nodejs
sudo npm install -g pm2  # 全局安装 PM2
sudo apt install -y docker.io docker-compose  # 安装 Docker 和 Docker Compose
sudo systemctl enable docker
sudo systemctl start docker
node -v  # 应显示 v18.x.x
npm -v  # 应显示对应版本
docker --version
docker-compose --version  # 验证安装
```

## 2. 项目目录结构
```plaintext
signal-project/
├── backend/                # 后端服务目录
│   ├── src/              # 源代码
│   │   └── index.js      # 主入口文件
│   ├── .env              # 环境变量配置文件
│   ├── package.json      # Node.js 项目依赖
│   └── pm2.config.js     # PM2 配置文件
├── data/                  # 数据存储目录
│   ├── signal/           # Signal-CLI 数据
│   └── db/              # PostgreSQL 数据
├── frontend/              # 前端目录
│   └── index.html        # 基本前端页面
├── sql/                   # 数据库脚本
│   └── 00-init.sql       # 初始化脚本
├── Dockerfile             # Signal-CLI Dockerfile
├── docker-compose.yml     # Docker Compose 配置文件
└── nginx.conf             # Nginx 配置文件
```

创建目录:
```bash
cd ~
mkdir -p signal-project/backend/src signal-project/data/signal signal-project/data/db signal-project/frontend signal-project/sql
touch signal-project/backend/.env signal-project/backend/package.json signal-project/backend/pm2.config.js signal-project/backend/src/index.js
touch signal-project/frontend/index.html signal-project/sql/00-init.sql signal-project/Dockerfile signal-project/docker-compose.yml signal-project/nginx.conf
```

## 3. 数据库搭建

### 3.1 安装 PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.2 创建数据库和用户
```bash
sudo -u postgres psql -c "CREATE USER signal_user WITH PASSWORD 'SignalSecurePass2023';"
sudo -u postgres psql -c "CREATE DATABASE signal_db OWNER signal_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE signal_db TO signal_user;"
```
> 注意：密码仅为示例，请务必替换为强密码。

### 3.3 执行建表脚本
```sql
-- 创建用户角色枚举类型
CREATE TYPE user_role AS ENUM ('user', 'admin', 'operator');

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signal 账号表（移除 password 字段，简化设计）
CREATE TABLE signal_accounts (
    phone_number VARCHAR(20) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    instance_id INTEGER,
    status VARCHAR(20) DEFAULT 'REGISTERED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引提升查询性能
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_signal_accounts_user_id ON signal_accounts(user_id);
```

执行脚本:
```bash
sudo -u postgres psql -d signal_db -f ~/signal-project/sql/00-init.sql
```

## 4. 后端服务开发

### 4.1 初始化后端项目
```bash
cd ~/signal-project/backend
npm init -y
npm install express pg axios dotenv pm2 bcrypt jsonwebtoken express-rate-limit
```

### 4.2 配置 .env 文件
```plaintext
PORT=3000  # 后端服务端口号
DB_HOST=localhost  # 数据库连接信息
DB_USER=signal_user
DB_PASSWORD=SignalSecurePass2023  # 请替换为实际强密码
DB_NAME=signal_db
JWT_SECRET=your_random_jwt_secret_32_chars_or_more  # JWT 密钥（建议至少 32 位随机字符串）
SIGNAL_CLI_URL=http://localhost:8080  # Signal-CLI REST API 服务地址
```

### 4.3 实现后端 API
```javascript
// backend/src/index.js
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.use(express.json());

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '请求过于频繁，请 15 分钟后再试'
});

app.use('/v1/register', limiter);
app.use('/v1/login', limiter);

// 注册 Signal 账号 API
app.post('/v1/register', async (req, res) => {
    const { phone_number } = req.body;
    if (!phone_number || !phone_number.match(/^\+\d{10,15}$/)) {
        return res.status(400).json({ error: '无效的电话号码，必须以 "+" 开头并包含 10-15 位数字' });
    }
    try {
        await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { number: phone_number });
        const { rows } = await pool.query(
            'INSERT INTO signal_accounts (phone_number) VALUES ($1) RETURNING phone_number',
            [phone_number]
        );
        res.status(201).json({
            message: '账号注册已成功发起，请完成 Signal-CLI 验证',
            phone_number: rows[0].phone_number
        });
    } catch (error) {
        console.error('注册错误:', error.message);
        res.status(500).json({ error: '账号注册失败，请稍后重试' });
    }
});

// 用户登录 API
app.post('/v1/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码为必填项' });
    }
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const token = jwt.sign(
            { user_id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(200).json({
            message: '登录成功',
            token,
            username: user.username,
            role: user.role
        });
    } catch (error) {
        console.error('登录错误:', error.message);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`后端服务运行在端口 ${PORT}`));
```

## 5. Docker 配置

### 5.1 Dockerfile
```Dockerfile
FROM bbernhard/signal-cli-rest-api:0.20.0
ENV MODE=json-rpc
ENV CORS_ALLOW_ORIGIN=*
EXPOSE 8080
VOLUME ["/home/.local/share/signal-cli"]
CMD ["./signal-cli-rest-api"]
```

### 5.2 docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: ../Dockerfile  # 注意：需调整为后端专用 Dockerfile 或直接运行 node
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
    depends_on:
      - db
      - signal-api
    environment:
      - NODE_ENV=production
    command: node src/index.js
    restart: always

  signal-api:
    image: bbernhard/signal-cli-rest-api:0.20.0
    ports:
      - "8080:8080"
    volumes:
      - ./data/signal:/home/.local/share/signal-cli
    restart: always

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: signal_user
      POSTGRES_PASSWORD: SignalSecurePass2023  # 替换为实际密码
      POSTGRES_DB: signal_db
    volumes:
      - ./data/db:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always
```

## 6. 部署与测试

### 6.1 启动服务
```bash
cd ~/signal-project
docker-compose up -d
```

### 6.2 测试 API
#### 插入测试用户
```bash
sudo -u postgres psql -d signal_db -c "INSERT INTO users (username, password) VALUES ('admin', '\$2b\$10\$/K8jJ8X8v8z...');"  # 插入用户
# 假设输出：$2b$10$/K8jJ...
node -e "require('bcrypt').hash('pass123', 10).then(console.log)"  # 在本地 Node.js 环境中生成密码哈希
```

#### 测试命令
```bash
curl -X POST http://localhost:3000/v1/login -H "Content-Type: application/json" -d '{"username": "admin", "password": "pass123"}'  # 测试登录 API
curl -X POST http://localhost:3000/v1/register -H "Content-Type: application/json" -d '{"phone_number": "+1234567890"}'  # 测试注册 API
```

## 下一步建议
- **可执行性**：适用于 Ubuntu 20.04 环境。
- **可读性**：详细注释、步骤说明。
- **代码健壮性**：输入验证、错误处理、日志记录。
- **安全性**：防火墙、SSH 密钥认证、使用强密码、频率限制等。

如需进一步调整或补充，请随时提出。
- Nginx 配置：HTTPS 支持和反向代理。
- 消息管理：集成 Signal-CLI 消息发送和接收。
- 账号管理功能：账号列表、修改、删除 API。
