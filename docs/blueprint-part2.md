# 《Signal-CLI 多账号管理系统》实施指南 - 第二部分：环境搭建与基础框架

本部分专注于环境搭建、基础框架构建以及账号管理功能的初步实现，确保系统能够在服务器上顺利运行。以下内容已结合最佳实践与优化建议进行完善。

### 1. 环境准备

#### 1.1 服务器配置

- 建议 2 核 4G Ubuntu 20.04 服务器，绑定域名（如 signal-api.yourdomain.com）。
- 加固安全：定期更新系统、配置 UFW、防范暴力破解、使用 SSH 公钥登录。

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp
```

#### 1.2 安装基础工具

```bash
# Node.js & PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Docker & Docker Compose
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker && sudo systemctl start docker

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql && sudo systemctl start postgresql
```

### 2. 项目目录结构

```plaintext
signal-project/
├── backend/           # 后端服务
│   ├── src/
│   └── index.js
│   ├── .env
│   ├── package.json
│   └── pm2.config.js
├── data/
































































































































以上为第二部分最终优化内容，如需调整请随时提出！- 逐步完善前端界面。- 引入监控和日志管理工具。  - 配置 Nginx 实现负载均衡与 HTTPS。  - 补充消息管理（发送、接收）、群组管理（创建、邀请）、联系人管理等功能。  ## 下一步---```curl -X POST http://localhost:3000/v1/login -H "Content-Type: application/json" -d '{"username":"admin","password":"pass123"}'curl -X POST http://localhost:3000/v1/register -H "Content-Type: application/json" -d '{"phone_number": "+999123456789"}'```bash然后：```  -c "INSERT INTO users (username, password) VALUES ('admin', '\$2b\$10\$examplehash');"sudo -u postgres psql -d signal_db \```bash可在部署前插入测试用户：### 6.2 测试```docker-compose up -d```bash### 6.1 启动容器## 6. 部署与测试---```    restart: always    # ...existing code...    image: postgres:16-alpine  db:    restart: always    # ...existing code...    image: bbernhard/signal-cli-rest-api:0.20.0  signal-api:    restart: always      - db    depends_on:    # ...existing code...  backend:services:version: '3.8'```yaml### 5.2 docker-compose.yml (简化)```CMD ["./signal-cli-rest-api"]VOLUME ["/home/.local/share/signal-cli"]EXPOSE 8080ENV CORS_ALLOW_ORIGIN=*ENV MODE=json-rpcFROM bbernhard/signal-cli-rest-api:0.20.0// ...existing code...```dockerfile### 5.1 Dockerfile## 5. Docker 配置---```});  // ...existing code...app.post('/v1/login', async (req, res) => {});  // ...existing code...app.post('/v1/register', async (req, res) => {```javascript// ...existing code...### 4.3 简要示例（注册 & 登录 API）```SIGNAL_CLI_URL=http://localhost:8080JWT_SECRET=your_random_jwt_secret_32_chars_or_moreDB_NAME=signal_dbDB_PASSWORD=SignalSecurePass2023DB_USER=signal_userDB_HOST=localhostPORT=3000```### 4.2 配置环境变量```npm install express pg axios dotenv pm2 bcrypt jsonwebtoken express-rate-limitnpm init -ycd backend```bash### 4.1 初始化## 4. 后端服务开发---```sudo -u postgres psql -d signal_db -f sql/00-init.sql```bash### 3.2 执行建表脚本```sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE signal_db TO signal_user;"sudo -u postgres psql -c "CREATE DATABASE signal_db OWNER signal_user;"sudo -u postgres psql -c "CREATE USER signal_user WITH PASSWORD 'SignalSecurePass2023';"```bash### 3.1 创建数据库## 3. 数据库搭建---```└── nginx.conf├── docker-compose.yml├── Dockerfile│   └── 00-init.sql├── sql/├── frontend/          # 前端│   └── db/│   ├── signal/├── data/              # 数据存储│   └── pm2.config.js│   ├── package.json│   ├── .env│   │   └── index.js│   ├── src/           ├── backend/           # 后端服务signal-project/```## 2. 项目目录结构---```sudo systemctl enable postgresql && sudo systemctl start postgresqlsudo apt install -y postgresql postgresql-contrib# PostgreSQLsudo systemctl enable docker && sudo systemctl start dockersudo apt install -y docker.io docker-compose# Docker & Docker Composesudo npm install -g pm2sudo apt install -y nodejscurl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -# Node.js & PM2```bash### 1.2 安装基础工具```sudo ufw enablesudo ufw allow 5432/tcpsudo ufw allow 443/tcpsudo ufw allow 80/tcpsudo ufw allow 22/tcpsudo apt install -y ufwsudo apt update && sudo apt upgrade -y```bash- 加固安全：定期更新系统、配置 UFW、防范暴力破解、使用 SSH 公钥登录。  - 建议 2 核 4G Ubuntu 20.04 服务器，绑定域名（如 signal-api.yourdomain.com）。  ### 1.1 服务器配置## 1. 环境准备---本部分专注于环境搭建、基础框架构建以及账号管理功能的初步实现，确保系统能够在服务器上顺利运行。以下内容已结合最佳实践与优化建议进行完善。# 《Signal-CLI 多账号管理系统》实施指南 - 第二部分：环境搭建与基础框架