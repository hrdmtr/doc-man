import { ParsedPDFData } from './parser';

export type DocumentType = 'invoice_issued' | 'receipt' | 'unknown';

export interface ClassificationResult {
  docType: DocumentType;
  confidence: number;
}

/**
 * PDFのテキストから書類種別を判定
 */
export function classifyDocumentType(parsedData: ParsedPDFData): ClassificationResult {
  const text = parsedData.text.toLowerCase();

  // 請求書のキーワード
  const invoiceKeywords = [
    '請求書',
    'invoice',
    '御請求',
    '請求金額',
    '請求先',
    'bill to',
  ];

  // 領収書のキーワード
  const receiptKeywords = [
    '領収書',
    '領収証',
    'receipt',
    '受領',
    '受取',
    '上記金額を領収',
  ];

  let invoiceScore = 0;
  let receiptScore = 0;

  // キーワードマッチング
  for (const keyword of invoiceKeywords) {
    if (text.includes(keyword)) {
      invoiceScore += 1;
    }
  }

  for (const keyword of receiptKeywords) {
    if (text.includes(keyword)) {
      receiptScore += 1;
    }
  }

  // PDFメタデータのタイトルもチェック
  const title = parsedData.info.Title?.toLowerCase() || '';
  if (title.includes('請求') || title.includes('invoice')) {
    invoiceScore += 2;
  }
  if (title.includes('領収') || title.includes('receipt')) {
    receiptScore += 2;
  }

  // 判定
  if (invoiceScore > receiptScore && invoiceScore > 0) {
    return {
      docType: 'invoice_issued',
      confidence: Math.min(invoiceScore / 3, 1.0),
    };
  } else if (receiptScore > invoiceScore && receiptScore > 0) {
    return {
      docType: 'receipt',
      confidence: Math.min(receiptScore / 3, 1.0),
    };
  } else {
    return {
      docType: 'unknown',
      confidence: 0,
    };
  }
}
