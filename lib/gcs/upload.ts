import { bucket } from './client';
import crypto from 'crypto';

export interface UploadOptions {
  file: Buffer;
  filename: string;
  contentType: string;
  docType: 'invoice_issued' | 'receipt';
  documentId: string;
}

export interface UploadResult {
  gcsPath: string;
  publicUrl: string;
  contentHash: string;
}

/**
 * PDFファイルをGCSにアップロード
 */
export async function uploadPDF(options: UploadOptions): Promise<UploadResult> {
  const { file, filename, contentType, docType, documentId } = options;

  // ファイルのSHA-256ハッシュを計算
  const contentHash = crypto
    .createHash('sha256')
    .update(file)
    .digest('hex');

  // GCSパスの生成
  const year = new Date().getFullYear();
  const folder = docType === 'invoice_issued' ? 'invoices/issued' : 'receipts';
  const safeFilename = sanitizeFilename(filename);
  const gcsPath = `${folder}/${year}/${documentId}_${safeFilename}`;

  // GCSにアップロード
  const fileRef = bucket.file(gcsPath);

  await fileRef.save(file, {
    contentType,
    metadata: {
      contentType,
      metadata: {
        originalFilename: filename,
        documentId,
        docType,
        uploadDate: new Date().toISOString(),
        contentHash,
      },
    },
  });

  // パブリックURLの生成（実際はsupabaseは署名URLを使用）
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsPath}`;

  return {
    gcsPath,
    publicUrl,
    contentHash,
  };
}

/**
 * GCSから署名付きURL（ダウンロード用）を生成
 */
export async function generateSignedUrl(
  gcsPath: string,
  expiresIn: number = 3600 // デフォルト1時間
): Promise<string> {
  const file = bucket.file(gcsPath);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  });

  return signedUrl;
}

/**
 * GCSからファイルを削除
 */
export async function deletePDF(gcsPath: string): Promise<void> {
  const file = bucket.file(gcsPath);
  await file.delete();
}

/**
 * GCSからファイルを取得
 */
export async function downloadPDF(gcsPath: string): Promise<Buffer> {
  const file = bucket.file(gcsPath);
  const [buffer] = await file.download();
  return buffer;
}

/**
 * ファイル名をサニタイズ（安全な文字のみ）
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 安全でない文字を_に置換
    .replace(/_{2,}/g, '_') // 連続する_を1つに
    .slice(0, 200); // 最大200文字
}
