import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateSignedUrl } from '@/lib/gcs/upload';

export const runtime = 'nodejs';

/**
 * GET /api/documents/[id]/download
 * 署名付きダウンロードURLを生成
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ドキュメント取得
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 署名URL生成（1時間有効）
    const signedUrl = await generateSignedUrl(document.gcs_path, 3600);

    // 監査ログ
    await supabaseAdmin.from('audit_logs').insert({
      document_id: id,
      action: 'download',
      metadata: {
        filename: document.original_filename,
      },
    });

    return NextResponse.json({
      signedUrl,
      filename: document.original_filename,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
