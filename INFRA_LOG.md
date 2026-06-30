# インフラ構築ログ

このファイルは、doc-manのデプロイ先をVercel+Supabase Cloud+GCSからSakuraVPS（既存のラーメン店サイトと同居）に変更する過程の作業ログ。
将来、環境構築用の別リポジトリに切り出す前提の一時的な記録場所。秘密情報（鍵の中身・パスワード等）は記載しない。

## 決定事項

- **ホスティング**: Vercelをやめ、Next.jsアプリをSakuraVPS上でDocker運用
- **DB/Auth**: Supabase Cloud無料枠を継続使用（セルフホストはしない。2GB RAMでは重いため）
- **ファイルストレージ**: GCS・NFS（さくらの¥880/月プラン）は見送り。VPSローカルSSDに直接保存＋安価なオブジェクトストレージへ定期バックアップ（**コード側の切り替えは未着手、現状はGCSのまま動く**）
- **リバースプロキシ/TLS**: 当初nginx+certbot案だったが方針変更。既存のラーメンサイト（nginx）も含めて**Caddyに統一移行**（低トラフィックな今がチャンスという判断）

## VPS情報

- ホスト: `ik1-416-40291.vs.sakura.ne.jp` (IP: `153.127.37.45`)
- OS: Rocky Linux 10.2
- スペック: 2GBメモリ / 3vCPU / 100GB SSD（さくらのVPS）
- SSHユーザー: `rocky`
- 移行前から稼働していたサービス:
  - nginx → Caddyに置き換え済み（詳細は下記）
  - `goatcounter`（127.0.0.1:8091） — アクセス解析
  - node製チャットサーバー（127.0.0.1:8092、systemdサービス名: `ramen-chat`）
- ディスク空き: 91GB / メモリ空き: 約1.4GB（調査時点）

## ドメイン

- `doc-man.mh-gk.com` → Aレコードで`153.127.37.45`に設定済み（2026-06-30 確認済み）

## SSH鍵

- `doc_man_vps`（このマシンの`~/.ssh/`に保存、Claude対話用） — `rocky`ユーザーの`authorized_keys`に登録済み
- `doc_man_actions`（同上、未使用） — GitHub ActionsのCIデプロイ用シークレットとして後で登録予定
- 既存の`heisei_ramen_vps` / `heisei_ramen_actions`はラーメンサイト用（既存、変更なし）

## 現在のCaddy構成（/etc/caddy/Caddyfile）

```
ramen.mh-gk.com {
    handle /api/chat* {
        reverse_proxy 127.0.0.1:8092
    }
    handle /admin* {
        reverse_proxy 127.0.0.1:8092
    }
    handle {
        root * /var/www/heisei-ramen/out
        try_files {path} {path}.html {path}/
        file_server
    }
    encode gzip
}

ik1-416-40291.vs.sakura.ne.jp {
    redir https://ramen.mh-gk.com{uri} permanent
}

ramen.mh-gk.com:8443 {
    reverse_proxy 127.0.0.1:8091
}

doc-man.mh-gk.com {
    reverse_proxy 127.0.0.1:3001
}
```

ロールバック手順（nginxに戻す）: `sudo systemctl stop caddy && sudo systemctl enable --now nginx`

nginxは`disable`済み（自動起動オフ）だがアンインストールはしていない。

## 環境情報

### 環境一覧

| 環境 | 場所 | .envファイル | 状態 |
|---|---|---|---|
| ローカル開発 | このマシン | `.env.local`（リポジトリ直下） | **未作成**。`.env.example`をコピーして作る想定 |
| VPS本番 | `/var/www/doc-man/.env` | `docker-compose.yml`が`env_file: .env`で読む | **未作成**。プレースホルダーでのみ動作確認済み |

デプロイ先パスは`/var/www/doc-man`に確定（2026-06-30、ラーメンサイトの`/var/www/heisei-ramen`と同じ規則、`rocky`ユーザー所有）。

### 必要な環境変数（`.env.example`と同一）

| 変数名 | 用途 | 現状 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL（ビルド時にも必要） | 未設定（プレースホルダーのみ） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（ビルド時にも必要） | 未設定 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（実行時のみ） | 未設定 |
| `GCS_PROJECT_ID` | GCPプロジェクトID | 未設定（将来ローカルディスク移行で不要になる可能性） |
| `GCS_BUCKET_NAME` | GCSバケット名 | 同上 |
| `GCS_CREDENTIALS` | GCSサービスアカウントJSON | 同上 |

**実在のSupabaseプロジェクトはまだ作成されていない。** SETUP.mdの手順に従って作成し、`supabase/schema.sql`を適用する必要がある。

## doc-man用Dockerfile

`Dockerfile`（リポジトリルート）は3段ビルド（deps/builder/runner）。`canvas`パッケージがネイティブビルドを要求するため、ビルドステージでは`-dev`系、ランタイムステージでは実行用の共有ライブラリ（`libcairo2`等）を別々にインストールしている。`next.config.ts`に`output: 'standalone'`を追加済み。

VPS上で`docker build`→コンテナ起動→`curl`で200確認まで完了（検証用に`/tmp/doc-man-test`へ一時転送してテストした。本番ビルドはGitHub Actions経由になるので後で削除予定）。

## 作業ログ（時系列、2026-06-30）

1. アーキテクチャ検討（Vercel/Supabase/GCS → VPS+Docker）。ストレージはNFS（¥880/月、冗長性なしと確認）を見送り、ローカルディスク+バックアップに決定
2. `website`リポジトリのREADME.mdに平文で残っていたBasic認証情報（アクセスカウンター用、機密度は低いが念のため）を発見・削除
3. `doc_man_vps` / `doc_man_actions` のSSH鍵を生成、`rocky`ユーザーの`authorized_keys`に登録・接続確認
4. `doc-man.mh-gk.com` のDNS Aレコードを確認（VPSのIPと一致）
5. VPS上の既存構成を調査（nginx稼働中・80/443/8443番ポート使用、Docker/Caddy未導入、ディスク/メモリ確認）
6. 既存nginx設定（`/etc/nginx/conf.d/*.conf`）を完全に把握
7. 方針転換: nginx+certbotではなく、既存ラーメンサイトも含めてCaddyに統一移行することに決定（低トラフィックな今がチャンスという判断）
8. Caddy 2.11.4をCOPR経由でインストール、Caddyfile作成・`caddy validate`でバリデーション
9. nginx→Caddyへ切り替え。全ドメインでLet's Encrypt証明書取得成功を確認。既存ルート（静的配信/チャットAPI/admin/goatcounter/リダイレクト）の挙動をバックエンド直接アクセスと比較し差異なしを確認。nginxは自動起動を無効化（ロールバック用に温存）
10. doc-man用Dockerfile作成（多段ビルド、canvas対応）、`next.config.ts`に`output: 'standalone'`追加
11. VPS上にDocker CE（el10公式パッケージ）をインストール
12. VPS上で実ビルドを実行し、以下の**既存コードのバグ**を発見・修正（Dockerとは無関係、`next build`の型チェックで表面化）:
    - Next.js 15で動的ルートの`params`が`Promise`型になった仕様変更に未対応（4ファイル: `app/api/documents/[id]/{route,confirm,download,parse}.ts`）
    - `lib/supabase/database.types.ts`に`Relationships`フィールドが欠落 → postgrest-jsの`GenericTable`制約を満たせず`.update()`の引数型が`never`に解決される不具合（`documents`/`extraction_results`/`audit_logs`の3テーブルに追加、後者2つはFK関連も記述）
    - `app/api/documents/route.ts`で検索クエリパラメータ（`status`/`doc_type`）がstring型のままDB列のリテラルunion型に渡されていた型不整合（as castで解消）
    - Dockerfileに存在しない`public/`ディレクトリへのCOPY行があったため削除
13. `docker build`成功、コンテナ起動・`curl http://127.0.0.1:3000/`で200 OKを確認

14. `docker-compose.yml`作成（`NEXT_PUBLIC_*`をbuild argsで渡し、`.env`をruntime環境変数として読み込む構成）。`docker compose config`で変数展開を確認、`docker compose up -d --build`で起動し`127.0.0.1:3001`が200を返すことを確認（プレースホルダー値でのテスト）
15. 「環境情報」セクションを追加。VPS上のデプロイ先パスを`/var/www/doc-man`に確定（ラーメンサイトの`/var/www/heisei-ramen`と同じ規則）

## 既知の未対応事項

- ストレージ方式（GCS→ローカルディスク）のコード変更は未着手。現在のDockerfileは元のGCSベースのコードでビルドが通る状態
- 実際のSupabase/GCS認証情報はまだ用意されていない（`.env.local`が存在しない）。本番デプロイ前にSupabaseプロジェクト作成・スキーマ適用が必要（SETUP.md参照）
- VPS上の`/tmp/doc-man-test`は検証用の手動転送ディレクトリ。本番はGitHub Actions経由のデプロイになるため不要、後で削除する

## 次のステップ

1. ストレージをGCSからローカルディスクに切り替えるコード変更（lib/gcs配下）
2. PDFバックアップスクリプト作成
3. GitHub Actionsデプロイワークフロー作成
4. 実際のSupabaseプロジェクトをセットアップし、本番`.env`をVPSに配置
