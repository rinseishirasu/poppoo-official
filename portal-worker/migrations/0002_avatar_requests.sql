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
