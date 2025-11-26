-- Migration: Create Q&A table
CREATE TABLE IF NOT EXISTS qna (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_embedding BLOB,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qna_created_at ON qna(created_at);
