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
