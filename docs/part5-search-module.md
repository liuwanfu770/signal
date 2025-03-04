# 搜索模块

本模块实现以下功能：
- 搜索联系人：根据关键词（如电话号码或备注）搜索用户的联系人。
- 搜索群组：根据群组名称或 ID 搜索用户加入的群组。
- 搜索消息：根据消息内容搜索历史消息。
- 存储搜索历史：将每次搜索的关键词和结果存储到数据库。
- 分页支持：支持搜索结果的分页展示。

## 数据表：search_history
- search_id：搜索 ID，自增主键
- phone_number：执行搜索的手机号
- search_query：搜索关键词
- search_type：搜索类型（CONTACT, GROUP, MESSAGE）
- search_results：搜索结果（JSON 格式）
- timestamp：搜索时间

## 操作流程
1. 在后端 `index.js` 中添加 /v1/search 和 /v1/search/history 路由。
2. 在前端 `index.html` 中添加搜索功能和历史查看界面。
3. 更新 `docker-compose.yml` 文件以支持搜索模块。

## 测试
可调用以下 API 测试功能：
```bash
curl -X GET "http://localhost:3000/v1/search?phone_number=+1234567890&query=0987654321&type=CONTACT"

curl -X GET "http://localhost:3000/v1/search?phone_number=+1234567890&query=TestGroup&type=GROUP"

curl -X GET "http://localhost:3000/v1/search?phone_number=+1234567890&query=Hello&type=MESSAGE"

curl -X GET "http://localhost:3000/v1/search/history?phone_number=+1234567890"
```
