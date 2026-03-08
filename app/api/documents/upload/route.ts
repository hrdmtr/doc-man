import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { uploadPDF } from '@/lib/gcs/upload';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60; // 最大60秒

/**
 * POST /api/documents/upload
 * PDFファイルをアップロード
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // ファイルバリデーション
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // ファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SHA-256ハッシュ計算
    const contentHash = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex');

    // 重複チェック
    const { data: existingDoc } = await supabaseAdmin
      .from('documents')
      .select('id, original_filename')
      .eq('content_hash', contentHash)
      .single();

    if (existingDoc) {
      return NextResponse.json(
        {
          error: 'This file has already been uploaded',
          existingDocument: existingDoc,
        },
        { status: 409 }
      );
    }

    // Documentレコード作成（一時的に、doc_typeは後で分類）
    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        doc_type: 'invoice_issued', // 仮の値（後で分類APIで更新）
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        content_hash: contentHash,
        gcs_bucket: process.env.GCS_BUCKET_NAME!,
        gcs_path: '', // アップロード後に更新
        status: 'uploaded',
      })
      .select()
      .single();

    if (dbError || !document) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // GCSにアップロード
    try {
      const uploadResult = await uploadPDF({
        file: buffer,
        filename: file.name,
        contentType: file.type,
        docType: 'invoice_issued', // 仮の値
        documentId: document.id,
      });

      // GCSパスを更新
      const { error: updateError } = await supabaseAdmin
        .from('documents')
        .update({
          gcs_path: uploadResult.gcsPath,
        })
        .eq('id', document.id);

      if (updateError) {
        console.error('Failed to update GCS path:', updateError);
      }

      // 監査ログ記録
      await supabaseAdmin.from('audit_logs').insert({
        document_id: document.id,
        action: 'upload',
        metadata: {
          filename: file.name,
          size: file.size,
          gcs_path: uploadResult.gcsPath,
        },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: document.id,
          filename: file.name,
          size: file.size,
          status: 'uploaded',
          gcsPath: uploadResult.gcsPath,
        },
      });
    } catch (gcsError) {
      // GCSアップロード失敗時はドキュメントレコードを削除
      await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', document.id);

      console.error('GCS upload error:', gcsError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
