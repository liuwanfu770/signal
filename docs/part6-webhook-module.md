# Webhook 模块

本模块实现以下功能：
- 接收消息通知：通过 Webhook 接收 Signal-CLI 发送的消息通知。
- 存储消息：将接收到的消息存储到数据库。
- 实时推送：使用 WebSocket 将新消息实时推送给前端用户。
- 支持多账户：确保 Webhook 能够处理来自多个 Signal-CLI 实例的通知。
- 消息状态更新：支持更新消息状态（如已送达、已读）。

## 数据表：messages
- id：消息 ID，自增主键
- sender_id：发送者手机号
- recipient_id：接收者手机号（单聊）
- group_id：群组 ID（群聊）
- content：消息内容
- type：消息类型（TEXT, IMAGE, etc.）
- status：状态（SENDING, SENT, DELIVERED, READ）
- timestamp：消息时间

## 操作流程
1. 在后端 `index.js` 中添加 /v1/webhook 路由。
2. 在前端 `index.html` 中添加实时消息接收功能。
3. 更新 `docker-compose.yml` 文件以支持 Webhook 模块。

## 测试
可调用以下 API 测试功能：
```bash
curl -X POST http://localhost:3000/v1/webhook \
  -H "Content-Type: application/json" \
  -d '{"envelope": {"source": "+1234567890", "dataMessage": {"message": "Test message"}}, "account": "+1112223333"}'
```
