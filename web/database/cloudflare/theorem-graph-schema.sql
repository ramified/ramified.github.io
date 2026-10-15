PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  checkpoint_at INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  write_id TEXT NOT NULL,
  force_checkpoint INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS history (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (document_id, revision)
);
-- Capture the previous version in the SAME transaction as the conditional write.
-- Autosaves replace the head; checkpoints are at most five minutes apart,
-- except when opening a new editing session or explicitly restoring a version.
CREATE TRIGGER IF NOT EXISTS document_checkpoint BEFORE UPDATE ON documents
WHEN NEW.force_checkpoint = 1 OR NEW.session_id != OLD.session_id
  OR NEW.updated_at - OLD.checkpoint_at >= 300000
BEGIN
  INSERT OR IGNORE INTO history VALUES
    (OLD.id, OLD.revision, OLD.title, OLD.content, OLD.updated_at);
  DELETE FROM history WHERE document_id = OLD.id AND revision NOT IN
    (SELECT revision FROM history WHERE document_id = OLD.id ORDER BY revision DESC LIMIT 50);
END;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  password_tag TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
