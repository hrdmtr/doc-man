-- ドキュメントテーブル
CREATE TABLE IF NOT EXISTS documents (
  -- 基本情報
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN ('invoice_issued', 'receipt')),
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash VARCHAR(64), -- SHA-256（重複検出用）

  -- GCS情報
  gcs_bucket VARCHAR(255) NOT NULL,
  gcs_path VARCHAR(500) NOT NULL,

  -- ステータス
  status VARCHAR(50) NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'parsed', 'needs_input', 'stored', 'failed')),

  -- 請求書（発行）専用フィールド
  counterparty VARCHAR(255), -- 宛先
  subject TEXT, -- 件名
  issue_date DATE, -- 発行日
  invoice_number VARCHAR(100),

  -- 領収書専用フィールド
  issuer VARCHAR(255), -- 発行元
  receipt_date DATE, -- 領収日

  -- 共通
  amount DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'JPY',

  -- メタ情報
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_counterparty ON documents(counterparty);
CREATE INDEX IF NOT EXISTS idx_documents_issuer ON documents(issuer);
CREATE INDEX IF NOT EXISTS idx_documents_issue_date ON documents(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_receipt_date ON documents(receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_content_hash ON documents(content_hash);

-- 抽出結果テーブル
CREATE TABLE IF NOT EXISTS extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL, -- 'counterparty' | 'subject' | 'issue_date' | etc.
  candidate_value TEXT,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1), -- 0.00 ~ 1.00
  source VARCHAR(50) CHECK (source IN ('pdf_text', 'ocr')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_results_document_id ON extraction_results(document_id);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('upload', 'parse', 'confirm', 'edit', 'download')),
  actor UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) ポリシー
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ドキュメント: ログインユーザーのみ読み書き可能
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = created_by OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = created_by OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = created_by OR auth.uid() IS NOT NULL);

-- 抽出結果: 対応するドキュメントの所有者のみアクセス可能
DROP POLICY IF EXISTS "Users can view extraction results for their documents" ON extraction_results;
CREATE POLICY "Users can view extraction results for their documents" ON extraction_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extraction_results.document_id
      AND (documents.created_by = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert extraction results for their documents" ON extraction_results;
CREATE POLICY "Users can insert extraction results for their documents" ON extraction_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extraction_results.document_id
      AND (documents.created_by = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

-- 監査ログ: 読み取り専用（システムが自動記録）
DROP POLICY IF EXISTS "Users can view audit logs for their documents" ON audit_logs;
CREATE POLICY "Users can view audit logs for their documents" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = audit_logs.document_id
      AND (documents.created_by = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );
