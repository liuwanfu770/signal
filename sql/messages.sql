CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id VARCHAR(20) NOT NULL,     -- 发送者 (手机号)
  recipient_id VARCHAR(20),           -- 接收者 (手机号)
  group_id VARCHAR(50),               -- 群组ID (若是群发)
  content TEXT NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('TEXT', 'IMAGE', 'VIDEO', 'FILE')),
  status VARCHAR(10) NOT NULL CHECK (status IN ('SENDING', 'SENT', 'FAILED', 'RECEIVED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建一些常用索引，便于查询
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_group ON messages(group_id);
