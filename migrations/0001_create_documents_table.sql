-- Migration: Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    content TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
