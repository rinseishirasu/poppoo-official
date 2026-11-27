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
