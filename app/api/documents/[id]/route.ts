import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/documents/[id]
 * ドキュメント詳細と抽出結果を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 抽出結果取得
    const { data: extractions } = await supabaseAdmin
      .from('extraction_results')
      .select('*')
      .eq('document_id', id)
      .order('confidence', { ascending: false });

    // 監査ログ取得
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('document_id', id)
      .order('timestamp', { ascending: false });

    return NextResponse.json({
      document,
      extractions: extractions || [],
      auditLogs: auditLogs || [],
    });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
