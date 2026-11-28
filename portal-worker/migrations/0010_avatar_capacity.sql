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
