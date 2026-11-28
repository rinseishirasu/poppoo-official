-- RC9 additive migration: private message notifications and operations tasks.
CREATE TABLE IF NOT EXISTS message_notifications (
 id TEXT PRIMARY KEY, member_id TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed','uncertain')),
 attempts INTEGER NOT NULL DEFAULT 0, last_result TEXT NOT NULL DEFAULT '',
 claim_id TEXT, claimed_at INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS message_notifications_queue ON message_notifications(state,created_at);
CREATE TRIGGER IF NOT EXISTS notify_direct_message AFTER INSERT ON direct_messages WHEN NEW.sender_role='member' BEGIN
 INSERT INTO message_notifications(id,member_id) SELECT NEW.id,member_id FROM accounts WHERE id=NEW.member_account_id AND role='member';
END;
CREATE TABLE IF NOT EXISTS operations_tasks (
 id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
 body TEXT NOT NULL DEFAULT '' CHECK(length(body)<=2000),
 priority TEXT NOT NULL CHECK(priority IN ('low','normal','high')),
 status TEXT NOT NULL CHECK(status IN ('open','doing','done','cancelled')),
 due_date TEXT NOT NULL DEFAULT '',
 member_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
 assignee_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
 actor_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS operations_tasks_member ON operations_tasks(member_account_id,status);
CREATE INDEX IF NOT EXISTS operations_tasks_status ON operations_tasks(status,due_date);
CREATE TRIGGER IF NOT EXISTS audit_task_create AFTER INSERT ON operations_tasks BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.actor_id,'task.create',NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_task_update AFTER UPDATE OF version ON operations_tasks WHEN NEW.version<>OLD.version BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.actor_id,'task.update.'||NEW.status,NEW.id);
END;
