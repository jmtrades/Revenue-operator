CREATE TABLE IF NOT EXISTS revenue_operator.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES revenue_operator.workspaces(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content_text TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_operator.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES revenue_operator.knowledge_documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_knowledge_chunks_workspace ON revenue_operator.knowledge_chunks(workspace_id);
CREATE INDEX idx_knowledge_docs_workspace ON revenue_operator.knowledge_documents(workspace_id);
