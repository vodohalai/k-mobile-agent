DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  content TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL
);
