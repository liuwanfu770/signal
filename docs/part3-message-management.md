# 消息管理模块

本模块实现以下功能：
- 消息发送：通过 Signal-CLI 接口发送文本或多媒体消息
- 消息接收：通过 /v1/webhook 接收消息并存储
- 消息存储：在 messages 表中记录消息详情
- WebSocket：实时向前端推送新消息

## 数据表：messages
- sender_id / recipient_id：存储手机号
- content：文本或多媒体内容
- status：消息状态（SENDING、SENT、DELIVERED、READ、RECEIVED 等）
- timestamp：消息时间戳

## 操作流程
1. 在数据库执行 01-messages.sql，创建新表。
2. 在后端 index.js 添加 /v1/messages 与 /v1/webhook 路由。
3. 配置 WebSocket，用于实时推送消息给客户端。

## 测试
可调用 POST /v1/messages 与 POST /v1/webhook 测试功能：
```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"sender_phone": "+1234567890","recipient":"+0987654321","content":"Hello!","type":"TEXT"}'
