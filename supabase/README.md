# Supabase セットアップ手順

## 1. Supabaseプロジェクト作成

1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. 新しいプロジェクトを作成
   - Organization: 適当な組織を選択or作成
   - Name: `doc-man` (任意)
   - Database Password: 強力なパスワードを設定（保存しておく）
   - Region: `Northeast Asia (Tokyo)` 推奨

## 2. データベーススキーマのセットアップ

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `schema.sql`の内容を貼り付けて実行

または、Supabase CLIを使用：

```bash
# Supabase CLIのインストール
npm install -g supabase

# プロジェクトの初期化
supabase init

# ローカルSupabaseの起動（開発用）
supabase start

# スキーマの適用
supabase db push
```

## 3. 環境変数の設定

### 必要な情報の取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の情報をコピー：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### .env.local ファイルの作成

プロジェクトルートに`.env.local`を作成：

```bash
cp .env.example .env.local
```

取得した情報を記入：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## 4. 認証設定（オプション）

### メール認証の設定

1. Supabaseダッシュボードで「Authentication」→「Providers」を開く
2. 「Email」を有効化
3. 必要に応じて「Confirm email」を設定

### Googleログインの設定（オプション）

1. 「Google」プロバイダーを有効化
2. Google Cloud Consoleでクライアント情報を取得
3. Supabaseに設定

## 5. Row Level Security (RLS) ポリシーの確認

`schema.sql`に含まれるRLSポリシー：

- **documents**: ログインユーザーが作成したドキュメントのみアクセス可能
- **extraction_results**: 対応するドキュメントの所有者のみアクセス可能
- **audit_logs**: 読み取り専用

開発中にRLSを無効化したい場合（非推奨）：

```sql
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
```

## 6. データベース型定義の更新（オプション）

Supabaseのスキーマが変更された場合、型定義を再生成：

```bash
# Supabase CLIで型生成
npx supabase gen types typescript --project-id <PROJECT_ID> > lib/supabase/database.types.ts
```

または手動で`lib/supabase/database.types.ts`を更新。

## 7. 動作確認

Next.jsアプリを起動して、Supabase接続を確認：

```bash
npm run dev
```

ブラウザのコンソールでエラーがないことを確認。

## トラブルシューティング

### 接続エラー

- 環境変数が正しく設定されているか確認
- Supabase URLとAPIキーが正しいか確認
- `.env.local`ファイルが`.gitignore`に含まれているか確認

### RLSポリシーエラー

- 開発中は一時的にRLSを無効化して確認
- `auth.uid()`が正しく取得できているか確認

### スキーマエラー

- SQLエラーメッセージを確認
- Supabase SQL Editorで直接実行して確認
