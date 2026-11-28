-- Private operations/member conversations.
CREATE TABLE IF NOT EXISTS direct_messages (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 member_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 sender_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
 sender_role TEXT NOT NULL CHECK(sender_role IN ('admin','member')),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 read_at TEXT
);
CREATE INDEX IF NOT EXISTS direct_messages_thread ON direct_messages(member_account_id,seq);
CREATE INDEX IF NOT EXISTS direct_messages_unread ON direct_messages(member_account_id,sender_role,read_at);
CREATE INDEX IF NOT EXISTS direct_messages_sender ON direct_messages(sender_id,created_at);
CREATE TRIGGER IF NOT EXISTS audit_direct_message AFTER INSERT ON direct_messages BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.sender_id,'message.send',NEW.id);
END;
