# 群组管理模块

本模块实现以下功能：
- 群组创建：通过 Signal-CLI 接口创建群组
- 加入群组：通过 Signal-CLI 接口加入群组
- 发送群组消息：通过 Signal-CLI 接口发送群组消息

## 数据表：groups 和 group_members
- groups：存储群组信息
- group_members：存储群组成员信息

## 操作流程
1. 在后端 `index.js` 中添加 /v1/groups 和 /v1/messages 路由。
2. 在前端 `index.html` 中添加创建群组和发送群组消息的界面。
3. 更新 `docker-compose.yml` 文件以支持群组管理。

## 测试
可调用以下 API 测试功能：
```bash
curl -X POST http://localhost:3000/v1/groups \
  -H "Content-Type: application/json" \
  -d '{"creator_phone": "+1234567890", "group_name": "TestGroup", "members": ["+0987654321"]}'

curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"sender_phone": "+1234567890", "group_id": "group.abcdefg123456", "content": "Hello group!", "type": "TEXT"}'
```
