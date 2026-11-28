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
