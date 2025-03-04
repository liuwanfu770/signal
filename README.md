# Signal-CLI 多账号管理系统

## 1. 项目概述

### 1.1 项目基本信息

| 项次 | 内容 |
| --- | --- |
| 项目名称 | Signal-CLI 多账号管理系统 |
| 项目目标 | 构建一个稳定、安全、可扩展的系统，支持管理多个 Signal 账号，实现消息收发、群组管理、联系人管理等核心功能，提供友好的管理界面和用户界面，并支持容器化部署。 |
| 目标用户 | - 管理员：负责账号注册、养号、续号、封控及系统监控。 <br> - 普通用户：使用分配的账号进行消息收发和日常聊天。 |
| 预期规模 | 支持管理 5000 个 Signal 账号，具备动态扩展能力。 |

### 1.2 项目范围

#### 1.2.1 功能需求

- 账号管理：支持账号的注册、登录、状态管理（在线/离线/连接中）、信息修改、删除、快速切换。
- 消息管理：支持文本和多媒体消息的发送、接收、状态跟踪（发送中/已发送/已送达/已读）、撤回（若支持）、转发（若支持）。
- 群组管理：支持群组的创建、加入、退出、信息管理、成员管理。
- 联系人管理：支持联系人的添加、删除、信息查看、分组（可选）。
- 搜索功能：支持搜索联系人、群组、消息，并将搜索信息存储到数据库。
- Webhook 支持：接收 Signal-CLI 的消息通知并处理。
- 防封策略：实现限流、延迟、IP 轮换等策略，降低账号被封风险。

#### 1.2.2 非功能需求

- 高可用性：系统支持多实例部署，单个实例故障不影响整体服务。
- 可靠性：确保消息发送和接收的成功率达到 99.9%。
- 可扩展性：支持动态增加 Signal-CLI 实例，适应账号数量增长。
- 可维护性：模块化设计，便于代码维护和功能扩展。
- 安全性：支持认证、授权、数据加密，确保用户数据安全。
- 合规性：遵守目标地区的数据隐私法规。
- 可移植性：支持容器化部署，可在不同云服务器上运行。
- 可观察性：提供日志和监控功能，便于问题排查。
- 易用性：提供直观的用户界面和管理界面。

#### 1.2.3 性能指标

| 指标 | 目标值 |
| --- | --- |
| 注册 TPS（每秒事务数） | 10 次/秒 |
| 消息发送 TPS | 50 次/秒 |
| 消息发送延迟 | < 500 毫秒 |
| 并发用户数 | 5000 用户 |
| 数据存储量 | 10 TB（长期目标） |

#### 1.2.4 安全需求

- 认证：使用 JWT（JSON Web Token）进行身份验证。
- 授权：基于角色的访问控制（RBAC），区分管理员和普通用户权限。
- 加密：用户密码使用 bcrypt 加密，敏感数据使用 AES-256 加密，传输使用 HTTPS。

#### 1.2.5 可选功能

- 与现有 CRM 系统集成。
- 数据分析和 BI（商业智能）功能。
- UI/UX 优化，打造更现代化的聊天界面。

## 2. 技术选型

以下技术选型基于项目的功能需求和非功能需求，经过反复评估，确保技术栈的稳定性和可扩展性。

| 类别 | 选型 | 说明 |
| --- | --- | --- |
| 后端语言 | Node.js | 简单易学，生态丰富，适合快速开发和高并发场景。 |
| 后端框架 | Express | 轻量级、灵活的 Node.js Web 框架，支持快速构建 REST API。 |
| 数据库 | PostgreSQL | 功能强大、开源的关系型数据库，支持高并发和复杂查询。 |
| HTTP 客户端 | axios | 用于调用 Signal-CLI REST API，轻量且易用。 |
| 进程管理 | PM2 | 保证后端进程稳定运行，支持热重载和负载均衡。 |
| 前端语言 | HTML/CSS/JavaScript | 初期使用基础技术栈，降低复杂度，后期可升级至 Vue.js 或 React。 |
| 容器化 | Docker, docker-compose | 实现服务快速部署、隔离和扩展，便于多实例管理。 |
| 反向代理 | Nginx | 实现负载均衡、SSL termination 和跨域处理。 |
| 日志管理 | ELK (Elasticsearch, Logstash, Kibana) | 收集、存储、分析日志，提供可视化查询界面。 |
| 监控工具 | Prometheus, Grafana | 监控系统指标（CPU、内存、网络等），提供实时仪表盘。 |
| 安全工具 | JWT, bcrypt, AES-256, HTTPS | 实现身份验证、授权、数据加密和传输安全。 |
| 版本控制 | Git | 代码版本管理，支持团队协作。 |
| 项目管理 | Jira, Confluence | 任务管理、文档协作（可选，视团队规模而定）。 |

### 2.1 技术选型理由

- Node.js + Express：异步 I/O 模型适合处理高并发请求，Express 提供简洁的路由和中间件支持。
- PostgreSQL：支持 JSONB 数据类型，适合存储复杂的消息和搜索结果，同时具备高可靠性。
- Docker：通过容器化实现 Signal-CLI 实例的隔离和扩展，每个实例管理固定数量的账号（建议 50-100 个）。
- Nginx：作为反向代理，分配前端请求到不同的 Signal-CLI 实例，提升负载均衡能力。
- ELK 和 Prometheus：提供全面的日志和监控支持，便于问题排查和性能优化。

## 3. 系统架构

系统采用分层架构，分为以下四层，确保职责清晰且易于扩展。

| 层级 | 功能描述 |
| --- | --- |
| 表示层 | - 前端用户界面：提供 Signal 聊天功能（账号登录、消息收发、联系人/群组管理）。 <br> - 控制管理界面：管理员监控系统状态、管理 Signal-CLI 容器、配置参数。 |
| 应用层 | - 后端 API 服务：处理表示层请求，调用业务逻辑层，返回结果（账号管理、消息管理等 API）。 <br> - Webhook 接收器：接收 Signal-CLI 消息通知并转发。 |
| 业务逻辑层 | - 实现账号注册、消息发送、群组创建等核心业务逻辑。 <br> - 调用基础设施层访问数据库和 Signal-CLI。 <br> - 防封号策略（限流、延迟、IP 轮换）。 |
| 基础设施层 | - 提供数据库访问、Signal-CLI 客户端调用、日志记录、监控指标收集等基础服务。 |

### 3.1 架构图

```
+-------------------------+
|       表示层            |
| - 前端用户界面          |
| - 控制管理界面          |
+-------------------------+
          ↓ (HTTP/HTTPS)
+-------------------------+
|       应用层            |
| - 后端 API 服务         |
| - Webhook 接收器        |
+-------------------------+
          ↓ (逻辑调用)
+-------------------------+
|       业务逻辑层        |
| - 账号/消息/群组逻辑    |
| - 防封策略              |
+-------------------------+
          ↓ (数据访问)
+-------------------------+
|       基础设施层        |
| - PostgreSQL            |
| - Signal-CLI 实例       |
| - 日志 (ELK)            |
| - 监控 (Prometheus)     |
+-------------------------+
```

### 3.2 架构特点

- 模块化：各层职责明确，便于维护和扩展。
- 高可用：多实例部署，Nginx 负载均衡。
- 安全性：HTTPS 传输，JWT 认证，数据加密。

## 4. 模块划分

系统按功能划分为以下模块，每个模块独立开发，便于后期扩展。

| 模块名称 | 功能描述 |
| --- | --- |
| 账号管理模块 | 注册、登录、状态管理、信息修改、删除、快速切换。 |
| 消息管理模块 | 文本/多媒体消息发送、接收、状态跟踪、撤回（若支持）、转发（若支持）。 |
| 群组管理模块 | 创建、加入、退出、信息管理、成员管理。 |
| 联系人管理模块 | 添加、删除、信息查看、分组（可选）。 |
| 搜索模块 | 搜索联系人、群组、消息，搜索信息存储到数据库。 |
| Webhook 模块 | 接收 Signal-CLI 消息通知并处理。 |
| 安全模块 | 身份验证、授权、数据加密、安全配置。 |
| 监控模块 | 收集系统指标、监控系统状态。 |
| 日志模块 | 记录系统日志，便于问题排查。 |
| 配置模块 | 集中管理配置（数据库连接、Signal-CLI URL 等）。 |

### 4.1 模块间关系

- 账号管理模块 调用 安全模块 进行认证，调用 搜索模块 记录注册搜索信息。
- 消息管理模块 调用 Webhook 模块 接收通知，调用 数据库 存储消息。
- 监控模块 和 日志模块 与所有模块交互，收集运行数据。

## 5. 数据库设计

### 5.1 数据库选择

- 类型：PostgreSQL
- 版本：16.1（最新稳定版）
- 理由：支持高并发、JSONB 数据类型（适合存储搜索结果和消息内容）、开源免费。

### 5.2 表结构设计

#### 5.2.1 users 表（用户表）

存储管理员和普通用户的信息。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | SERIAL | PRIMARY KEY | 用户 ID，自增主键 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名，唯一 |
| password | VARCHAR(255) | NOT NULL | 密码，使用 bcrypt 加密 |
| role | VARCHAR(20) | DEFAULT 'user' | 角色（admin 或 user） |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

#### 5.2.2 signal_accounts 表（Signal 账号表）

存储 Signal 账号信息。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| phone_number | VARCHAR(20) | PRIMARY KEY | 手机号，唯一标识 |
| user_id | INTEGER | REFERENCES users(id) | 关联的用户 ID |
| instance_id | INTEGER |  | 分配的 Signal-CLI 实例 ID |
| status | VARCHAR(20) | DEFAULT 'REGISTERED' | 状态（REGISTERED, VERIFIED, ACTIVE, DISABLED） |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| last_active | TIMESTAMP |  | 最后活跃时间 |

#### 5.2.3 messages 表（消息表）

存储消息内容。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | SERIAL | PRIMARY KEY | 消息 ID，自增主键 |
| sender_id | VARCHAR(20) | REFERENCES signal_accounts(phone_number) | 发送者手机号 |
| recipient_id | VARCHAR(20) | REFERENCES signal_accounts(phone_number) | 接收者手机号（单聊） |
| group_id | INTEGER | REFERENCES groups(id) | 群组 ID（群聊时使用） |
| content | TEXT |  | 消息内容（文本或 JSON 格式的多媒体） |
| type | VARCHAR(20) |  | 消息类型（TEXT, IMAGE, VIDEO, FILE） |
| status | VARCHAR(20) | DEFAULT 'SENDING' | 状态（SENDING, SENT, DELIVERED, READ） |
| timestamp | TIMESTAMP | DEFAULT NOW() | 消息发送时间 |

#### 5.2.4 groups 表（群组表）

存储群组信息。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | SERIAL | PRIMARY KEY | 群组 ID，自增主键 |
| name | VARCHAR(255) | NOT NULL | 群组名称 |
| owner_id | VARCHAR(20) | REFERENCES signal_accounts(phone_number) | 群主手机号 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

#### 5.2.5 group_members 表（群组成员表）

存储群组成员关系。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| group_id | INTEGER | REFERENCES groups(id) | 群组 ID |
| user_id | VARCHAR(20) | REFERENCES signal_accounts(phone_number) | 成员手机号 |
| role | VARCHAR(20) | DEFAULT 'MEMBER' | 角色（ADMIN, MEMBER） |
| joined_at | TIMESTAMP | DEFAULT NOW() | 加入时间 |

#### 5.2.6 contacts 表（联系人表）

存储联系人关系。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| user_id | VARCHAR(20) | REFERENCES signal_accounts(phone_number) | 用户手机号 |
| contact_id | VARCHAR(20) | REFERENCES signal_accounts(phone_number) | 联系人手机号 |
| added_at | TIMESTAMP | DEFAULT NOW() | 添加时间 |

#### 5.2.7 search_history 表（搜索历史表）

存储注册账号时的搜索信息。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| search_id | SERIAL | PRIMARY KEY | 搜索 ID，自增主键 |
| phone_number | VARCHAR(20) | REFERENCES signal_accounts(phone_number) | 搜索的手机号 |
| search_query | VARCHAR(255) |  | 搜索关键词（如用户名或备注） |
| search_results | JSONB |  | 搜索结果（JSON 格式，存储匹配的联系人或群组） |
| timestamp | TIMESTAMP | DEFAULT NOW() | 搜索时间 |

#### 5.2.8 containers 表（容器表）

存储 Signal-CLI 容器信息。

| 字段名 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | SERIAL | PRIMARY KEY | 容器 ID，自增主键 |
| container_id | VARCHAR(255) | UNIQUE, NOT NULL | Docker 容器唯一标识符 |
| ip_address | VARCHAR(15) |  | 分配的 IP 地址 |
| status | VARCHAR(20) | DEFAULT 'RUNNING' | 容器状态（RUNNING, STOPPED, ERROR） |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| last_check_at | TIMESTAMP |  | 最后检查时间 |

### 5.3 索引设计

- users 表：为 username 创建唯一索引，优化登录查询。
- signal_accounts 表：为 user_id 和 status 创建索引，优化用户账号查询。
- messages 表：为 sender_id、recipient_id、group_id 创建索引，优化消息检索。
- search_history 表：为 phone_number 和 timestamp 创建索引，优化搜索历史查询。

### 5.4 建表脚本

以下是 PostgreSQL 的建表语句，可直接执行：

```sql
-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Signal 账号表
CREATE TABLE signal_accounts (
    phone_number VARCHAR(20) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    instance_id INTEGER,
    status VARCHAR(20) DEFAULT 'REGISTERED',
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    recipient_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    group_id INTEGER REFERENCES groups(id),
    content TEXT,
    type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'SENDING',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 群组表
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 群组成员表
CREATE TABLE group_members (
    group_id INTEGER REFERENCES groups(id),
    user_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- 联系人表
CREATE TABLE contacts (
    user_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    contact_id VARCHAR(20) REFERENCES signal_accounts(phone_number),
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, contact_id)
);

-- 搜索历史表
CREATE TABLE search_history (
    search_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) REFERENCES signal_accounts(phone_number),
    search_query VARCHAR(255),
    search_results JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 容器表
CREATE TABLE containers (
    id SERIAL PRIMARY KEY,
    container_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(15),
    status VARCHAR(20) DEFAULT 'RUNNING',
    created_at TIMESTAMP DEFAULT NOW(),
    last_check_at TIMESTAMP
);

-- 创建索引
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_signal_accounts_user_id ON signal_accounts(user_id);
CREATE INDEX idx_signal_accounts_status ON signal_accounts(status);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_search_history_phone_number ON search_history(phone_number);
CREATE INDEX idx_search_history_timestamp ON search_history(timestamp);
```
