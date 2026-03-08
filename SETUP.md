# セットアップ手順書

## 前提条件

- Node.js 18以上
- npm
- Googleアカウント（GCS用）
- Supabaseアカウント（無料）

## 1. リポジトリのクローン

```bash
git clone <repository-url>
cd doc-man
npm install
```

## 2. Supabaseプロジェクトのセットアップ

### 2.1 プロジェクト作成

1. https://supabase.com にアクセスしてサインイン
2. 「New Project」をクリック
3. 以下を設定：
   - Name: `doc-man` (任意)
   - Database Password: 強力なパスワードを設定（保存しておく）
   - Region: `Northeast Asia (Tokyo)` 推奨
   - Plan: **Free** を選択
4. 「Create new project」をクリック（数分かかる）

### 2.2 データベーススキーマの適用

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase/schema.sql`の内容を全てコピー
3. SQL Editorに貼り付けて「Run」を実行
4. 成功メッセージを確認

### 2.3 環境変数の取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`（「Reveal」をクリック）

## 3. Google Cloud Storageのセットアップ

### 3.1 プロジェクト作成

1. https://console.cloud.google.com にアクセス
2. 「新しいプロジェクト」を作成
   - プロジェクト名: `doc-man` (任意)
   - プロジェクトIDをメモ

### 3.2 Cloud Storageバケット作成

1. 左メニューから「Cloud Storage」→「バケット」を選択
2. 「バケットを作成」をクリック
3. 設定：
   - 名前: `doc-man-storage-<your-unique-id>` (グローバルでユニークな名前)
   - ロケーションタイプ: `Region`
   - ロケーション: `asia-northeast1` (東京)
   - ストレージクラス: `Standard`
   - アクセス制御: `均一` を推奨
4. 「作成」をクリック

### 3.3 サービスアカウントの作成

1. 左メニューから「IAMと管理」→「サービスアカウント」を選択
2. 「サービスアカウントを作成」をクリック
3. 設定：
   - 名前: `doc-man-storage`
   - ID: 自動生成されるものでOK
4. 「作成して続行」をクリック
5. ロールを付与：
   - 「ロールを選択」→「Cloud Storage」→「Storage Object Admin」を選択
6. 「続行」→「完了」をクリック

### 3.4 サービスアカウントキーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを開く
3. 「鍵を追加」→「新しい鍵を作成」をクリック
4. キーのタイプ: **JSON** を選択
5. 「作成」をクリック
6. JSONファイルがダウンロードされる（**厳重に保管！**）

## 4. 環境変数の設定

### 4.1 .env.localファイルの作成

プロジェクトルートで：

```bash
cp .env.example .env.local
```

### 4.2 環境変数を記入

`.env.local`を開いて以下を記入：

```env
# Supabase（ステップ2.3で取得）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=doc-man-storage-<your-unique-id>
GCS_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"..."}
```

**GCS_CREDENTIALS の設定方法：**

1. ダウンロードしたJSONファイルを開く
2. 内容全体を1行にして`GCS_CREDENTIALS=`の後に貼り付け

例：
```env
GCS_CREDENTIALS={"type":"service_account","project_id":"doc-man-123","private_key_id":"abc...","private_key":"-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n","client_email":"doc-man-storage@doc-man-123.iam.gserviceaccount.com","client_id":"123...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}
```

## 5. 動作確認

### 5.1 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 5.2 テストページでAPI確認

http://localhost:3000/test にアクセス

**テスト手順：**

1. **PDFファイルを準備**（請求書または領収書のPDF）
2. **アップロード**：
   - ファイルを選択
   - 「アップロード」ボタンをクリック
   - 結果にドキュメントIDが表示されることを確認
3. **PDF解析**：
   - 表示されたドキュメントIDをコピー
   - 「解析実行」ボタンをクリック
   - 抽出された候補が表示されることを確認
4. **詳細取得**：
   - 「詳細取得」ボタンをクリック
   - ドキュメント情報、抽出結果、監査ログが表示されることを確認

### 5.3 エラーが出る場合

**環境変数エラー:**
```
Error: Missing Supabase environment variables
```
→ `.env.local`が正しく設定されているか確認
→ 開発サーバーを再起動（Ctrl+C → `npm run dev`）

**GCS認証エラー:**
```
Error: Could not load the default credentials
```
→ `GCS_CREDENTIALS`が正しくJSON形式で設定されているか確認
→ 改行や特殊文字のエスケープを確認

**Supabase接続エラー:**
```
Error: Invalid API key
```
→ Supabase URL とキーが正しいか確認
→ ダッシュボードで再度確認

## 6. 次のステップ

動作確認が完了したら：

1. フロントエンドUIの実装
2. Supabase Authの統合（ログイン機能）
3. 本番環境へのデプロイ（Vercel）

## トラブルシューティング

### npm installが失敗する

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ビルドエラー

```bash
npm run build
```

でエラーがないか確認。TypeScriptエラーがあれば修正。

### PDF解析が失敗する

- PDFがテキストベースか確認（画像PDFは未対応）
- ファイルサイズが5MB以下か確認
- 日本語フォントが埋め込まれているか確認

## セキュリティ注意事項

⚠️ **重要:**

- `.env.local`は**絶対にGitにコミットしない**
- サービスアカウントキーJSONファイルも**Gitにコミットしない**
- `.gitignore`に含まれているか確認
- 本番環境ではVercelの環境変数で設定

## 料金について

現在の構成（Free Tier）：

- Supabase Free: $0/月（500MB、無制限ユーザー）
- GCS: $0/月（無料枠：5GB、Class A 5,000回、Class B 50,000回）
- Vercel Hobby: $0/月（100GB転送/月）

**合計: $0/月**（開発・MVP段階）

本番運用時（データ量増加時）の想定コスト：ARCHITECTURE.md参照
