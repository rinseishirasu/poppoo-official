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
