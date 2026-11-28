-- POPPO MEMBER PORTAL 1.0: installation from empty DB; RC11 rebuilds avatar_requests preserving rows. For upgrades apply only the required migration.
-- 0001_initial.sql
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL COLLATE NOCASE UNIQUE,
 member_id TEXT UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('member','admin')),
 status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','suspended')),
 password_hash TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(role = 'admin' OR member_id IS NOT NULL),
 CHECK(status != 'active' OR password_hash IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
CREATE TABLE IF NOT EXISTS activation_tokens (
 token_hash TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL,
 used_at TEXT
);
CREATE TABLE IF NOT EXISTS profile_requests (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES accounts(id),
 base_revision TEXT NOT NULL,
 patch_json TEXT NOT NULL CHECK(json_valid(patch_json)),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','returned','withdrawn')),
 review_note TEXT,
 reviewed_by TEXT REFERENCES accounts(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS profile_requests_owner ON profile_requests(account_id,status);
CREATE TABLE IF NOT EXISTS audit_log (
 id TEXT PRIMARY KEY,
 actor_id TEXT REFERENCES accounts(id),
 action TEXT NOT NULL,
 target_id TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS login_limits (
 bucket_hash TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL DEFAULT 0,
 window_until INTEGER NOT NULL
);

-- 0002_avatar_requests.sql
-- Private, bounded image submissions. Never publish the payload directly.
CREATE TABLE IF NOT EXISTS avatar_requests (
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 slot TEXT NOT NULL CHECK(slot IN ('icon','avatar1','avatar2','avatar3')),
 id TEXT NOT NULL UNIQUE,
 mime TEXT NOT NULL CHECK(mime IN ('image/png','image/jpeg','image/webp')),
 image_data BLOB NOT NULL CHECK(length(image_data) BETWEEN 12 AND 524288),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(account_id,slot)
);

-- 0003_member_operations.sql
-- Additive migration for member-only activity records, notices and applications.
CREATE TABLE IF NOT EXISTS member_activity (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('activity','anniversary')),
 event_date TEXT NOT NULL,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
 description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=1000),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS member_activity_owner ON member_activity(account_id,event_date);
CREATE TABLE IF NOT EXISTS portal_notices (
 id TEXT PRIMARY KEY,
 author_id TEXT NOT NULL REFERENCES accounts(id),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 published INTEGER NOT NULL DEFAULT 1 CHECK(published IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notice_reads (
 notice_id TEXT NOT NULL REFERENCES portal_notices(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(notice_id,account_id)
);
CREATE TABLE IF NOT EXISTS member_applications (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES accounts(id),
 kind TEXT NOT NULL CHECK(kind IN ('pause','resume','leave','other')),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 1000),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','returned','withdrawn')),
 review_note TEXT,
 reviewed_by TEXT REFERENCES accounts(id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS member_applications_owner ON member_applications(account_id,status);

-- 0004_publication_jobs.sql
-- Durable review and publication state. A processing job locks its source request.
CREATE TABLE IF NOT EXISTS publication_jobs (
 request_id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('profile','avatar')),
 account_id TEXT NOT NULL REFERENCES accounts(id),
 actor_id TEXT NOT NULL REFERENCES accounts(id),
 state TEXT NOT NULL CHECK(state IN ('processing','published','failed','returned')),
 commit_sha TEXT,
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS publication_jobs_owner ON publication_jobs(account_id,state);

-- 0005_audit_triggers.sql
-- Audit state transitions without copying personal data, passwords, tokens or submission content.
CREATE TRIGGER IF NOT EXISTS audit_account_create AFTER INSERT ON accounts BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NULL,'account.create',NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_account_status AFTER UPDATE OF status ON accounts WHEN OLD.status<>NEW.status BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NULL,'account.status.'||NEW.status,NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_password_change AFTER UPDATE OF password_hash ON accounts WHEN OLD.password_hash IS NOT NEW.password_hash BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NULL,'account.credential.update',NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_profile_submit AFTER INSERT ON profile_requests BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.account_id,'profile.'||NEW.status,NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_profile_status AFTER UPDATE OF status ON profile_requests WHEN OLD.status<>NEW.status BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),CASE WHEN NEW.status IN ('approved','returned') THEN NEW.reviewed_by ELSE NEW.account_id END,'profile.'||NEW.status,NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_notice_create AFTER INSERT ON portal_notices BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.author_id,'notice.create',NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_notice_status AFTER UPDATE OF published ON portal_notices WHEN OLD.published<>NEW.published BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NULL,'notice.visibility.update',NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_application_create AFTER INSERT ON member_applications BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.account_id,'application.submit',NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_application_status AFTER UPDATE OF status ON member_applications WHEN OLD.status<>NEW.status BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),CASE WHEN NEW.status IN ('accepted','returned') THEN NEW.reviewed_by ELSE NEW.account_id END,'application.'||NEW.status,NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS audit_publication_start AFTER INSERT ON publication_jobs BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.actor_id,'publication.'||NEW.state,NEW.request_id);
END;
CREATE TRIGGER IF NOT EXISTS audit_publication_status AFTER UPDATE OF state ON publication_jobs WHEN OLD.state<>NEW.state BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.actor_id,'publication.'||NEW.state,NEW.request_id);
END;

-- Additive: durable collaboration publication state. Preserve existing applications.
CREATE TABLE IF NOT EXISTS collab_publication_jobs (
 request_id TEXT PRIMARY KEY REFERENCES member_applications(id),
 account_id TEXT NOT NULL REFERENCES accounts(id),
 actor_id TEXT NOT NULL REFERENCES accounts(id),
 state TEXT NOT NULL CHECK(state IN ('processing','published','failed')),
 commit_sha TEXT,
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS collab_publication_owner ON collab_publication_jobs(account_id,state);
CREATE TRIGGER IF NOT EXISTS audit_collab_start AFTER INSERT ON collab_publication_jobs BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.actor_id,'collab.'||NEW.state,NEW.request_id);
END;
CREATE TRIGGER IF NOT EXISTS audit_collab_status AFTER UPDATE OF state ON collab_publication_jobs WHEN OLD.state<>NEW.state BEGIN
 INSERT INTO audit_log(id,actor_id,action,target_id) VALUES(lower(hex(randomblob(16))),NEW.actor_id,'collab.'||NEW.state,NEW.request_id);
END;
CREATE TRIGGER IF NOT EXISTS collab_finish_application AFTER UPDATE OF state ON collab_publication_jobs WHEN OLD.state='processing' AND NEW.state='published' BEGIN
 UPDATE member_applications SET status='accepted',review_note=NEW.note,reviewed_by=NEW.actor_id,updated_at=CURRENT_TIMESTAMP WHERE id=NEW.request_id AND account_id=NEW.account_id AND status='pending';
 SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'collab application changed') END;
END;

-- Transactional notification outbox; no application body, email or credentials.
CREATE TABLE IF NOT EXISTS review_notifications (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('profile','activity','anniversary','icon','avatar','collab','pause','resume','leave','other')),
 member_id TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed','uncertain')),
 attempts INTEGER NOT NULL DEFAULT 0,
 last_result TEXT NOT NULL DEFAULT '',
 claim_id TEXT,
 claimed_at INTEGER,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS review_notifications_queue ON review_notifications(state,created_at);
CREATE TRIGGER IF NOT EXISTS notify_profile_insert AFTER INSERT ON profile_requests WHEN NEW.status='pending' BEGIN
 INSERT INTO review_notifications(id,kind,member_id) SELECT NEW.id,CASE json_extract(NEW.patch_json,'$.recordPublication.kind') WHEN 'activity' THEN 'activity' WHEN 'anniversary' THEN 'anniversary' ELSE 'profile' END,member_id FROM accounts WHERE id=NEW.account_id AND role='member';
END;
CREATE TRIGGER IF NOT EXISTS notify_profile_submit AFTER UPDATE OF status ON profile_requests WHEN OLD.status<>'pending' AND NEW.status='pending' BEGIN
 INSERT INTO review_notifications(id,kind,member_id) SELECT NEW.id,CASE json_extract(NEW.patch_json,'$.recordPublication.kind') WHEN 'activity' THEN 'activity' WHEN 'anniversary' THEN 'anniversary' ELSE 'profile' END,member_id FROM accounts WHERE id=NEW.account_id AND role='member';
END;
CREATE TRIGGER IF NOT EXISTS notify_avatar_insert AFTER INSERT ON avatar_requests BEGIN
 INSERT INTO review_notifications(id,kind,member_id) SELECT NEW.id,CASE NEW.slot WHEN 'icon' THEN 'icon' ELSE 'avatar' END,member_id FROM accounts WHERE id=NEW.account_id AND role='member';
END;
CREATE TRIGGER IF NOT EXISTS notify_avatar_replace AFTER UPDATE OF id ON avatar_requests WHEN OLD.id<>NEW.id BEGIN
 INSERT INTO review_notifications(id,kind,member_id) SELECT NEW.id,CASE NEW.slot WHEN 'icon' THEN 'icon' ELSE 'avatar' END,member_id FROM accounts WHERE id=NEW.account_id AND role='member';
END;
CREATE TRIGGER IF NOT EXISTS notify_application_insert AFTER INSERT ON member_applications WHEN NEW.status='pending' BEGIN
 INSERT INTO review_notifications(id,kind,member_id) SELECT NEW.id,CASE WHEN NEW.kind='other' AND (instr(NEW.body,'[POPPŌ コラボ配信申請 v1]'||char(10))=1 OR instr(NEW.body,'[POPPŌ コラボ配信申請 v2]'||char(10))=1) THEN 'collab' ELSE NEW.kind END,member_id FROM accounts WHERE id=NEW.account_id AND role='member';
END;

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

-- RC11: rebuild only avatar_requests to increase the BLOB allowance.
-- Apply once, as a single migration, with portal writes paused and a recovery point.
-- Copy before recreating notification triggers: no duplicate alerts for existing rows.
CREATE TABLE avatar_requests_rc11 (
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 slot TEXT NOT NULL CHECK(slot IN ('icon','avatar1','avatar2','avatar3')),
 id TEXT NOT NULL UNIQUE,
 mime TEXT NOT NULL CHECK(mime IN ('image/png','image/jpeg','image/webp')),
 image_data BLOB NOT NULL CHECK(length(image_data) BETWEEN 12 AND 1572864),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(account_id,slot)
);
INSERT INTO avatar_requests_rc11(account_id,slot,id,mime,image_data,created_at)
 SELECT account_id,slot,id,mime,image_data,created_at FROM avatar_requests;
DROP TABLE avatar_requests;
ALTER TABLE avatar_requests_rc11 RENAME TO avatar_requests;
CREATE TRIGGER IF NOT EXISTS notify_avatar_insert AFTER INSERT ON avatar_requests BEGIN
 INSERT INTO review_notifications(id,kind,member_id) SELECT NEW.id,CASE NEW.slot WHEN 'icon' THEN 'icon' ELSE 'avatar' END,member_id FROM accounts WHERE id=NEW.account_id AND role='member';
END;
CREATE TRIGGER IF NOT EXISTS notify_avatar_replace AFTER UPDATE OF id ON avatar_requests WHEN OLD.id<>NEW.id BEGIN
 INSERT INTO review_notifications(id,kind,member_id) SELECT NEW.id,CASE NEW.slot WHEN 'icon' THEN 'icon' ELSE 'avatar' END,member_id FROM accounts WHERE id=NEW.account_id AND role='member';
END;
