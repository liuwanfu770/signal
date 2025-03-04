# 联系人管理模块

本模块实现以下功能：
- 联系人同步：从 Signal-CLI 同步联系人到数据库
- 联系人查看：列出用户的联系人列表，支持分页或筛选
- 联系人添加：手动添加联系人到指定账号
- 联系人删除：从指定账号中移除联系人

## 数据表：contacts
- user_id：用户手机号
- contact_id：联系人手机号
- added_at：添加时间

## 操作流程
1. 在后端 `index.js` 中添加 /v1/contacts/sync、/v1/contacts、/v1/contacts 和 /v1/contacts 路由。
2. 在前端 `index.html` 中添加联系人管理界面。
3. 更新 `docker-compose.yml` 文件以支持联系人管理。

## 测试
可调用以下 API 测试功能：
```bash
curl -X POST http://localhost:3000/v1/contacts/sync \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'

curl -X POST http://localhost:3000/v1/contacts \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "contact_phone": "+0987654321"}'

curl -X GET "http://localhost:3000/v1/contacts?phone_number=+1234567890"

curl -X DELETE http://localhost:3000/v1/contacts \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "contact_phone": "+0987654321"}'
```
