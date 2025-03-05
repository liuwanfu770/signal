CREATE TABLE contacts (
  user_id VARCHAR(20),
  contact_id VARCHAR(20),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, contact_id)
);

CREATE TABLE signal_accounts (
  phone_number VARCHAR(20) PRIMARY KEY,
  instance_id VARCHAR(50)
);
