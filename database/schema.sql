CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id VARCHAR(20) NOT NULL,
  recipient_id VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(10) NOT NULL,
  status VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);

CREATE TABLE groups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_members (
  group_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  role VARCHAR(10) NOT NULL,
  status VARCHAR(10) DEFAULT 'JOINED',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES signal_accounts(phone_number)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
