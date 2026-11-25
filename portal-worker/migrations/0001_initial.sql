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
