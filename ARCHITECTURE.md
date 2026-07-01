# アーキテクチャ設計書

## 目次
- [最終構成](#最終構成)
- [検討プロセス](#検討プロセス)
- [データフロー](#データフロー)
- [データベーススキーマ](#データベーススキーマ)
- [環境変数](#環境変数)
- [コスト見積もり](#コスト見積もり)

---

## 最終構成

### システム構成図

```
┌─────────────────────────────────────────────┐
│  Next.js (React + TypeScript + API Routes)  │
│  ホスティング: Vercel Hobby (無料)           │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
    ▼                            ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Supabase Cloud     │  │  Google Cloud       │
│  (Free Tier)        │  │  Storage            │
│  ・PostgreSQL       │  │  (PDFファイル保存)   │
│  ・Auth             │  │                     │
└─────────────────────┘  └─────────────────────┘
```

### 技術スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| **フロントエンド** | Next.js 15 + React 19 + TypeScript | モダンなフルスタックフレームワーク、型安全性 |
| **スタイリング** | Tailwind CSS | 高速な開発、柔軟性 |
| **データベース** | Supabase (PostgreSQL) | コスト最適、柔軟なクエリ、認証統合 |
| **認証** | Supabase Auth | DB統合、追加コストなし |
| **ファイルストレージ** | Google Cloud Storage | 信頼性、要件での指定 |
| **PDF解析** | pdf-parse (Node.js) | Next.js API Routesで実行 |
| **デプロイ** | Vercel Hobby | git push自動デプロイ、無料 |

---

## 検討プロセス

### 1. データベース選定

#### 検討した選択肢

**A. Firestore**
- 料金: 10万件で $1〜5/月
- メリット: GCP統一、サーバーレス、自動スケール
- デメリット: クエリ制約、ベンダーロックイン
- 評価: ⭐⭐⭐⭐☆

**B. MongoDB Atlas**
- 料金: 10万件で $57〜140/月 (M10〜M20)
- メリット: スキーマレス、豊富なクエリ機能
- デメリット: コスト高、別サービス管理
- 評価: ⭐⭐⭐☆☆

**C. Supabase (PostgreSQL)** ✅ **採用**
- 料金: 10万件で $1〜5/月（Free Tierなら$0）
- メリット: **圧倒的コスパ**、PostgreSQL、認証統合、オープンソース
- デメリット: 大きなデメリットなし
- 評価: ⭐⭐⭐⭐⭐

#### 決定理由
- **コスト**: Firestoreと同等かそれ以下
- **柔軟性**: PostgreSQLの強力なクエリ機能
- **認証統合**: 追加コストなしでAuth使用可能
- **将来性**: VPSセルフホスト可能（コストさらに削減可能）

---

### 2. バックエンドAPI

#### 検討した選択肢

**A. Cloud Run (Node.js/Express)**
- 料金: $5〜10/月
- メリット: 柔軟性、実行時間制限なし
- デメリット: 開発・管理コスト増

**B. Next.js API Routes** ✅ **採用**
- 料金: Vercel込みで$0
- メリット: フロントエンドと同一リポジトリ、デプロイ簡単
- デメリット: Serverless制限（実行時間）

#### 決定理由
- **MVP優先**: API分離は過剰設計
- **開発速度**: フルスタックNext.jsが最速
- **コスト**: 完全無料
- **拡張性**: 将来必要ならAPI分離可能

---

### 3. 認証

#### 検討した選択肢

**A. Firebase Auth**
- 料金: 無料（10,000認証/月まで）
- メリット: Googleエコシステム統一
- デメリット: Supabaseと別管理

**B. NextAuth.js**
- 料金: 無料
- メリット: 柔軟性
- デメリット: 実装コスト高

**C. Supabase Auth** ✅ **採用**
- 料金: 無料（Free Tier無制限）
- メリット: DB統合、Row Level Security、追加コストなし
- デメリット: なし

#### 決定理由
- **統合性**: Supabase DBと完全統合
- **コスト**: 追加費用なし
- **セキュリティ**: PostgreSQL RLSで細かい制御可能

---

### 4. ファイルストレージ

#### 検討した選択肢

**A. Google Cloud Storage** ✅ **採用**
- 料金: 無料枠 5GB/月まで $0、超過分 $0.02/GB
- メリット: 圧倒的な信頼性（イレブンナイン耐久性）、無料枠で MVP 規模は十分、署名 URL で安全なダウンロード
- デメリット: GCP アカウント管理が必要

**B. VPS ローカルディスク**
- 料金: $0（VPS 代に含む）
- メリット: 追加コストなし、レイテンシ低
- デメリット: ディスク障害でデータ消失リスク、バックアップを自前で組む必要あり、VPS 移行時のデータ移行コスト

**C. Supabase Storage**
- 料金: Free Tier 1GB まで $0
- メリット: Supabase に統合
- デメリット: 無料枠が GCS より少ない

#### 決定理由
- **信頼性**: クラウドオブジェクトストレージの耐久性はローカルディスクと比較にならない。請求書・領収書という重要書類を扱うため信頼性を最優先
- **コスト**: 無料枠（5GB/月）で MVP 規模は十分。PDF 1 件あたり平均 500KB とすると約 1 万件まで無料枠内
- **実装済み**: GCS 連携コードが既に実装されており、切り替えコストが発生しない

---

### 5. ホスティング

#### 検討した選択肢

**A. Vercel Hobby** ✅ **採用**
- 料金: 無料（商用はPro $20/月）
- メリット: Next.js最適化、git push自動デプロイ、プレビュー環境
- デメリット: 商用利用は有料

**B. Cloudflare Pages**
- 料金: 完全無料（商用もOK）
- メリット: 無料、CDN最強
- デメリット: Next.js App Routerサポートが限定的

**C. Cloud Run**
- 料金: $0〜5/月
- メリット: GCP統一
- デメリット: セットアップ複雑

#### 決定理由
- **開発体験**: Vercelが圧倒的
- **MVP段階**: Hobbyで十分
- **将来**: 商用化時にPro検討 or Cloudflare移行

---

## データフロー

### アップロード〜保存フロー

```
1. ユーザーがPDFをDrag & Drop
   ↓
2. POST /api/documents/upload (Next.js API Route)
   ・バリデーション（PDF、5MB以下）
   ・GCSにアップロード
   ・Supabase: Document作成（status: 'uploaded'）
   ↓
3. POST /api/documents/[id]/parse
   ・GCSからPDF取得
   ・pdf-parseで解析（宛先、件名、日付等）
   ・Supabase: ExtractionResult保存
   ・Supabase: Document更新（status: 'parsed'）
   ↓
4. フロントエンド: 確認画面表示
   ・抽出候補表示（宛先、件名、日付）
   ・ユーザーが確認・補完入力
   ↓
5. POST /api/documents/[id]/confirm
   ・Supabase: 確定タグを保存
   ・Supabase: Document更新（status: 'stored'）
   ・Supabase: AuditLog記録
```

### 検索フロー

```
1. フロントエンド: 検索条件入力
   ・doc_type（請求書/領収書）
   ・宛先/発行元
   ・日付範囲
   ・件名（部分一致）
   ↓
2. Supabase PostgreSQL直接クエリ
   ・WHERE句でフィルタ
   ・LIKE句で件名検索
   ・ORDER BY issue_date/receipt_date DESC
   ↓
3. フロントエンド: 結果一覧表示
   ↓
4. 詳細表示時
   ・GET /api/documents/[id]/download
   ・GCS署名URL発行（有効期限付き）
   ・PDF表示/ダウンロード
```

---

## データベーススキーマ

### documents テーブル

```sql
CREATE TABLE documents (
  -- 基本情報
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type VARCHAR(50) NOT NULL, -- 'invoice_issued' | 'receipt'
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash VARCHAR(64), -- SHA-256（重複検出用）

  -- GCS情報
  gcs_bucket VARCHAR(255) NOT NULL,
  gcs_path VARCHAR(500) NOT NULL,

  -- ステータス
  status VARCHAR(50) NOT NULL, -- 'uploaded' | 'parsed' | 'needs_input' | 'stored' | 'failed'

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- インデックス
  CONSTRAINT check_doc_type CHECK (doc_type IN ('invoice_issued', 'receipt')),
  CONSTRAINT check_status CHECK (status IN ('uploaded', 'parsed', 'needs_input', 'stored', 'failed'))
);

-- インデックス
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_counterparty ON documents(counterparty);
CREATE INDEX idx_documents_issuer ON documents(issuer);
CREATE INDEX idx_documents_issue_date ON documents(issue_date DESC);
CREATE INDEX idx_documents_receipt_date ON documents(receipt_date DESC);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_content_hash ON documents(content_hash);
```

### extraction_results テーブル

```sql
CREATE TABLE extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL, -- 'counterparty' | 'subject' | 'issue_date' | etc.
  candidate_value TEXT,
  confidence DECIMAL(3,2), -- 0.00 ~ 1.00
  source VARCHAR(50), -- 'pdf_text' | 'ocr'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_extraction_results_document_id ON extraction_results(document_id);
```

### audit_logs テーブル

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'upload' | 'parse' | 'confirm' | 'edit' | 'download'
  actor UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB, -- 追加情報（変更内容等）

  CONSTRAINT check_action CHECK (action IN ('upload', 'parse', 'confirm', 'edit', 'download'))
);

CREATE INDEX idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
```

---

## 環境変数

### 必要な環境変数（.env.local）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=doc-man-storage
GCS_CREDENTIALS={"type":"service_account",...}
```

### セットアップ手順

1. **Supabase プロジェクト作成**
   - https://supabase.com でプロジェクト作成
   - Settings → API から URL と ANON_KEY を取得
   - Settings → API → Service Role Key を取得

2. **GCS バケット作成**
   - Google Cloud Console でプロジェクト作成
   - Cloud Storage でバケット作成（`doc-man-storage`）
   - サービスアカウント作成＋JSON キーダウンロード
   - 権限: Storage Object Admin

3. **環境変数設定**
   - `.env.local` ファイル作成
   - 上記の値を設定

---

## コスト見積もり

### 開発段階（完全無料）

| サービス | プラン | 料金 |
|---|---|---|
| Supabase | Free Tier | $0 |
| Google Cloud Storage | 無料枠（5GB/月） | $0 |
| Vercel | Hobby | $0 |
| **合計** | | **$0** |

### 本番運用（データ量別）

#### 1万件の場合

| サービス | プラン | データ量 | 料金/月 |
|---|---|---|---|
| Supabase | Free Tier | ~30MB | $0 |
| GCS | Standard | ~5GB | $0（無料枠内） |
| Vercel | Hobby | - | $0 |
| **合計** | | | **$0** |

#### 10万件の場合

| サービス | プラン | データ量 | 料金/月 |
|---|---|---|---|
| Supabase | Pro | ~300MB | $25 |
| GCS | Standard | ~50GB | $1〜2 |
| Vercel | Hobby/Pro | - | $0〜20 |
| **合計** | | | **$26〜47** |

#### 100万件の場合

| サービス | プラン | データ量 | 料金/月 |
|---|---|---|---|
| Supabase | Pro | ~3GB | $25 |
| GCS | Standard | ~500GB | $10〜15 |
| Vercel | Pro | - | $20 |
| **合計** | | | **$55〜60** |

### 代替案: VPSセルフホスト（コスト最適化）

本番運用で月額コストをさらに削減したい場合：

| サービス | プラン | 料金/月 |
|---|---|---|
| Hetzner VPS | CPX11 (2vCPU, 4GB) | $5 |
| Supabase（セルフホスト） | Docker Compose | $0 |
| GCS | Standard | $1〜2 |
| Vercel/Cloudflare Pages | Hobby/Free | $0 |
| **合計** | | **$6〜7** |

注意: VPSセルフホストは運用負荷が高い（バックアップ、監視、セキュリティ更新等）

---

## 将来の拡張性

### スケーリング戦略

1. **データ量増加時**
   - Supabase Pro継続 or VPSセルフホスト移行
   - GCS: 自動スケール（料金は従量課金）

2. **トラフィック増加時**
   - Vercel Pro へアップグレード
   - or Cloudflare Pages（無料）へ移行

3. **機能追加時**
   - OCR追加: Google Cloud Vision API統合
   - 全文検索: PostgreSQL Full Text Search
   - 会計ソフト連携: API分離（Cloud Run等）

### 技術的負債の回避

- **モノリス回避**: Next.jsで統一しつつ、API Routesで疎結合
- **ベンダーロックイン回避**: Supabaseはオープンソース（PostgreSQL）
- **テストビリティ**: TypeScriptで型安全性確保

---

## まとめ

### アーキテクチャの特徴

✅ **コスト最適**: 開発無料、本番$26〜47/月
✅ **開発速度**: Next.js + Supabaseで高速開発
✅ **スケーラビリティ**: 100万件まで対応可能
✅ **拡張性**: 将来のAPI分離・機能追加に対応
✅ **ベンダーロック回避**: オープンソース技術

### トレードオフ

- PDF解析: Serverless制限あり（60秒）→ 重い処理は別途対応検討
- 商用Vercel: Pro必要（$20/月）→ Cloudflare Pages移行で回避可能

---

**作成日**: 2026-03-08
**最終更新**: 2026-03-08
