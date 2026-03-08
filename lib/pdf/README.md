# PDF解析機能

## 概要

PDFファイルからテキストを抽出し、請求書・領収書の情報を自動抽出する機能。

## 機能一覧

### 1. PDFパース (`parser.ts`)

- `parsePDF(buffer: Buffer)`: PDFファイルをパースしてテキストとメタデータを抽出

### 2. ドキュメント分類 (`classifier.ts`)

- `classifyDocumentType(parsedData)`: PDFが請求書か領収書かを判定

### 3. データ抽出 (`extractor.ts`)

#### 請求書（発行）から抽出
- `extractInvoiceData(parsedData)`: 以下の情報を抽出
  - 宛先 (counterparty)
  - 件名 (subject)
  - 発行日 (issueDate)
  - 請求書番号 (invoiceNumber)
  - 金額 (amount)

#### 領収書から抽出
- `extractReceiptData(parsedData)`: 以下の情報を抽出
  - 発行元 (issuer)
  - 領収日 (receiptDate)
  - 金額 (amount)

## 使用例

```typescript
import { parsePDF } from '@/lib/pdf/parser';
import { classifyDocumentType } from '@/lib/pdf/classifier';
import { extractInvoiceData, extractReceiptData } from '@/lib/pdf/extractor';

// 1. PDFをパース
const parsedData = await parsePDF(pdfBuffer);

// 2. ドキュメントタイプを判定
const classification = classifyDocumentType(parsedData);
console.log('Document Type:', classification.docType);
console.log('Confidence:', classification.confidence);

// 3. データを抽出
if (classification.docType === 'invoice_issued') {
  const invoiceData = extractInvoiceData(parsedData);
  console.log('Counterparty candidates:', invoiceData.counterparty);
  console.log('Subject candidates:', invoiceData.subject);
  console.log('Date candidates:', invoiceData.issueDate);
  console.log('Amount candidates:', invoiceData.amount);
} else if (classification.docType === 'receipt') {
  const receiptData = extractReceiptData(parsedData);
  console.log('Issuer candidates:', receiptData.issuer);
  console.log('Date candidates:', receiptData.receiptDate);
  console.log('Amount candidates:', receiptData.amount);
}
```

## 抽出結果の構造

各フィールドは複数の候補（`ExtractionCandidate[]`）を返します：

```typescript
interface ExtractionCandidate {
  fieldName: string;        // フィールド名
  candidateValue: string;   // 抽出された値
  confidence: number;       // 信頼度 (0.0 ~ 1.0)
  source: 'pdf_text';       // 抽出元
}
```

## 抽出ロジック

### 宛先（Counterparty）
- キーワード: 「御中」「様」「殿」「宛」「To:」「Attn:」
- 最初の20行を検索
- 信頼度: 0.7

### 発行元（Issuer）
- パターン: 「株式会社」「有限会社」「Co., Ltd.」等
- 最初の10行を検索
- 信頼度: 0.6

### 件名（Subject）
- キーワード: 「件名」「内容」「Subject:」「Re:」
- 最初の30行を検索
- 信頼度: 0.7

### 日付（Date）
- パターン:
  - `2024年1月1日`
  - `2024/01/01`
  - `2024-01-01`
  - `令和6年1月1日`（自動で西暦変換）
- 信頼度: 0.8

### 請求書番号（Invoice Number）
- キーワード: 「請求書番号」「請求No」「Invoice No」「Invoice #」
- 英数字とハイフンのみ抽出
- 信頼度: 0.8

### 金額（Amount）
- パターン:
  - `¥1,000,000`
  - `1,000,000円`
  - `合計: 1,000,000`
  - `Total: 1,000,000`
- 妥当な範囲: 100円〜1億円
- 最大金額を優先（合計金額が最大のはず）
- 信頼度: 0.7

## 制限事項

### 現在の実装
- テキストベースのPDFのみ対応
- スキャン画像PDFは未対応（OCR必要）
- 日本語と英語の混在ドキュメントに最適化
- ルールベースの抽出（機械学習は未使用）

### 今後の改善案
1. **OCR対応**: Google Cloud Vision APIで画像PDF対応
2. **機械学習**: より高精度な抽出モデルの導入
3. **多言語対応**: 他言語のパターン追加
4. **学習機能**: ユーザー修正から学習
5. **テーブル抽出**: 明細行の抽出

## トラブルシューティング

### 抽出結果が空の場合

- PDFがテキストベースか確認（スキャン画像PDFはNG）
- 日本語フォントが埋め込まれているか確認
- パターンマッチングが日本語フォーマットに対応しているか確認

### 誤った値が抽出される場合

- 信頼度（confidence）を確認
- 複数候補から手動選択を促す
- ユーザーフィードバックで改善

### パフォーマンスが悪い場合

- 大きなPDFは処理に時間がかかる
- API Routesのタイムアウトに注意（Vercel: 60秒）
- 非同期処理を推奨
