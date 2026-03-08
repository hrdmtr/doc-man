# Google Cloud Storage セットアップ手順

## 1. Google Cloud プロジェクト作成

1. https://console.cloud.google.com にアクセス
2. 新しいプロジェクトを作成
   - プロジェクト名: `doc-man` (任意)
   - プロジェクトIDをメモ

## 2. Cloud Storage バケット作成

1. Google Cloud Console で「Cloud Storage」→「バケット」を開く
2. 「バケットを作成」をクリック
3. 設定：
   - 名前: `doc-man-storage` (グローバルでユニークな名前)
   - ロケーションタイプ: `Region`
   - ロケーション: `asia-northeast1` (東京)
   - ストレージクラス: `Standard`
   - アクセス制御: `均一` 推奨
   - 保護ツール: 必要に応じて設定

## 3. サービスアカウント作成

1. 「IAM と管理」→「サービスアカウント」を開く
2. 「サービスアカウントを作成」をクリック
3. 設定：
   - 名前: `doc-man-storage`
   - ID: 自動生成されるものでOK
   - 説明: `Document management storage access`
4. ロールを付与：
   - `Storage Object Admin` を選択
5. 「完了」をクリック

## 4. サービスアカウントキーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを開く
3. 「鍵を追加」→「新しい鍵を作成」
4. キーのタイプ: `JSON` を選択
5. 「作成」をクリック
6. JSONファイルがダウンロードされる（**厳重に保管**）

## 5. 環境変数の設定

### JSONキーの内容を確認

ダウンロードしたJSONファイルを開く：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  ...
}
```

### .env.local に追加

```env
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=doc-man-storage
GCS_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...",...}
```

**注意**: `GCS_CREDENTIALS`は1行で、JSONファイルの内容全体を文字列として設定。

## 6. バケットのCORS設定（オプション）

フロントエンドから直接アップロードする場合：

```bash
# cors.json ファイルを作成
cat > cors.json <<'EOF'
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "POST", "PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

# CORSを設定
gsutil cors set cors.json gs://doc-man-storage
```

## 7. 動作確認

```typescript
import { uploadPDF, generateSignedUrl } from '@/lib/gcs/upload';

// アップロードテスト
const result = await uploadPDF({
  file: buffer,
  filename: 'test.pdf',
  contentType: 'application/pdf',
  docType: 'invoice_issued',
  documentId: 'test-id',
});

console.log('Uploaded:', result.gcsPath);

// 署名URL生成テスト
const signedUrl = await generateSignedUrl(result.gcsPath);
console.log('Signed URL:', signedUrl);
```

## セキュリティベストプラクティス

### 1. サービスアカウントキーの管理

- **絶対にGitにコミットしない**
- `.gitignore`に`.env.local`と`*.json`を追加
- 本番環境ではVercelの環境変数で設定

### 2. バケットのアクセス制御

- パブリックアクセスを無効化
- 署名URLでのみアクセス許可
- 有効期限を適切に設定（デフォルト1時間）

### 3. IAMロールの最小権限

- サービスアカウントには`Storage Object Admin`のみ付与
- プロジェクト全体の権限は付与しない

## コスト管理

### 無料枠（毎月）

- ストレージ: 5GB
- Class A操作（書き込み）: 5,000回
- Class B操作（読み取り）: 50,000回
- ネットワーク下り: 1GB（北米のみ）

### 料金（asia-northeast1）

- ストレージ: $0.023/GB/月
- Class A操作: $0.005/1,000回
- Class B操作: $0.0004/1,000回

### コスト削減のヒント

1. **ライフサイクル管理**: 古いファイルを削除or別ストレージクラスへ移行
2. **圧縮**: 可能ならPDFを圧縮
3. **署名URLのキャッシュ**: 同じファイルの署名URLを再利用

## トラブルシューティング

### 認証エラー

```
Error: Could not load the default credentials
```

- `GCS_CREDENTIALS`環境変数が正しく設定されているか確認
- JSONが正しくパースできるか確認

### アップロードエラー

```
Error: The caller does not have permission
```

- サービスアカウントに`Storage Object Admin`ロールが付与されているか確認
- バケット名が正しいか確認

### 署名URLエラー

```
Error: Invalid argument
```

- `gcsPath`が正しいか確認
- バケット内にファイルが存在するか確認
