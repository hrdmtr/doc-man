import { ParsedPDFData } from './parser';

export interface ExtractionCandidate {
  fieldName: string;
  candidateValue: string;
  confidence: number;
  source: 'pdf_text';
}

export interface InvoiceExtractionResult {
  counterparty: ExtractionCandidate[];
  subject: ExtractionCandidate[];
  issueDate: ExtractionCandidate[];
  invoiceNumber: ExtractionCandidate[];
  amount: ExtractionCandidate[];
}

export interface ReceiptExtractionResult {
  issuer: ExtractionCandidate[];
  receiptDate: ExtractionCandidate[];
  amount: ExtractionCandidate[];
}

/**
 * 請求書（発行）からデータを抽出
 */
export function extractInvoiceData(parsedData: ParsedPDFData): InvoiceExtractionResult {
  const text = parsedData.text;
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  return {
    counterparty: extractCounterparty(lines),
    subject: extractSubject(lines),
    issueDate: extractDate(lines),
    invoiceNumber: extractInvoiceNumber(lines),
    amount: extractAmount(lines),
  };
}

/**
 * 領収書からデータを抽出
 */
export function extractReceiptData(parsedData: ParsedPDFData): ReceiptExtractionResult {
  const text = parsedData.text;
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  return {
    issuer: extractIssuer(lines),
    receiptDate: extractDate(lines),
    amount: extractAmount(lines),
  };
}

/**
 * 宛先を抽出（請求書）
 */
function extractCounterparty(lines: string[]): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];

  // キーワードベースの抽出
  const keywords = ['御中', '様', '殿', '宛', 'To:', 'Attn:'];

  for (let i = 0; i < lines.length && i < 20; i++) {
    const line = lines[i];

    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        // キーワードを含む行から宛先を抽出
        const candidate = line.replace(keyword, '').trim();

        if (candidate.length > 0 && candidate.length < 100) {
          candidates.push({
            fieldName: 'counterparty',
            candidateValue: candidate,
            confidence: 0.7,
            source: 'pdf_text',
          });
        }
      }
    }
  }

  // 上位3件まで返す
  return candidates.slice(0, 3);
}

/**
 * 発行元を抽出（領収書）
 */
function extractIssuer(lines: string[]): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];

  // 最初の数行から会社名らしきものを抽出
  const companyPatterns = [
    /株式会社.+/,
    /有限会社.+/,
    /.+株式会社/,
    /.+有限会社/,
    /.+Co\.?,?\s*Ltd\.?/i,
    /.+Corporation/i,
    /.+Inc\.?/i,
  ];

  for (let i = 0; i < lines.length && i < 10; i++) {
    const line = lines[i];

    for (const pattern of companyPatterns) {
      const match = line.match(pattern);
      if (match) {
        candidates.push({
          fieldName: 'issuer',
          candidateValue: match[0].trim(),
          confidence: 0.6,
          source: 'pdf_text',
        });
      }
    }
  }

  return candidates.slice(0, 3);
}

/**
 * 件名を抽出
 */
function extractSubject(lines: string[]): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];

  // キーワードベースの抽出
  const keywords = ['件名', '内容', 'Subject:', 'Re:'];

  for (let i = 0; i < lines.length && i < 30; i++) {
    const line = lines[i];

    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        const candidate = line.replace(keyword, '').replace(':', '').trim();

        if (candidate.length > 0 && candidate.length < 200) {
          candidates.push({
            fieldName: 'subject',
            candidateValue: candidate,
            confidence: 0.7,
            source: 'pdf_text',
          });
        }
      }
    }
  }

  return candidates.slice(0, 3);
}

/**
 * 日付を抽出
 */
function extractDate(lines: string[]): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];

  // 日付パターン
  const datePatterns = [
    // 2024年1月1日
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    // 2024/01/01, 2024-01-01
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // 令和6年1月1日
    /令和(\d{1,2})年(\d{1,2})月(\d{1,2})日/,
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let dateStr = match[0];

        // 令和を西暦に変換
        if (match[0].includes('令和')) {
          const reiwa = parseInt(match[1]);
          const year = 2018 + reiwa;
          const month = match[2].padStart(2, '0');
          const day = match[3].padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else if (match[0].includes('年')) {
          const year = match[1];
          const month = match[2].padStart(2, '0');
          const day = match[3].padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else {
          const year = match[1];
          const month = match[2].padStart(2, '0');
          const day = match[3].padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }

        candidates.push({
          fieldName: 'issue_date',
          candidateValue: dateStr,
          confidence: 0.8,
          source: 'pdf_text',
        });
      }
    }
  }

  // 重複削除
  const uniqueDates = Array.from(new Set(candidates.map(c => c.candidateValue)));
  return uniqueDates.slice(0, 5).map(date => ({
    fieldName: 'issue_date',
    candidateValue: date,
    confidence: 0.8,
    source: 'pdf_text',
  }));
}

/**
 * 請求書番号を抽出
 */
function extractInvoiceNumber(lines: string[]): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];

  // キーワードベースの抽出
  const keywords = ['請求書番号', '請求No', 'Invoice No', 'Invoice #'];

  for (const line of lines) {
    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        // キーワードの後の番号を抽出
        const parts = line.split(keyword);
        if (parts.length > 1) {
          const numberPart = parts[1].replace(/[:：\s]/g, '').trim();
          const match = numberPart.match(/^[A-Z0-9\-]+/);

          if (match) {
            candidates.push({
              fieldName: 'invoice_number',
              candidateValue: match[0],
              confidence: 0.8,
              source: 'pdf_text',
            });
          }
        }
      }
    }
  }

  return candidates.slice(0, 3);
}

/**
 * 金額を抽出
 */
function extractAmount(lines: string[]): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = [];

  // 金額パターン
  const amountPatterns = [
    // ¥1,000,000 or ￥1,000,000
    /[¥￥]\s*([\d,]+)/,
    // 1,000,000円
    /([\d,]+)\s*円/,
    // 合計: 1,000,000
    /合計[：:]\s*([\d,]+)/,
    // Total: 1,000,000
    /Total[：:]\s*([\d,]+)/i,
  ];

  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseInt(amountStr);

        // 妥当な金額範囲（100円〜1億円）
        if (amount >= 100 && amount <= 100000000) {
          candidates.push({
            fieldName: 'amount',
            candidateValue: amount.toString(),
            confidence: 0.7,
            source: 'pdf_text',
          });
        }
      }
    }
  }

  // 金額の大きい順にソート（合計金額が最も大きいはず）
  candidates.sort((a, b) => parseInt(b.candidateValue) - parseInt(a.candidateValue));

  return candidates.slice(0, 3);
}
