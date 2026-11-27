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
