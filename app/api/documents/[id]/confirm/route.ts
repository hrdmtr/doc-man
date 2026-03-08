import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/documents/[id]/confirm
 * タグを確定して保存
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

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

    // バリデーション
    const { doc_type } = document;

    if (doc_type === 'invoice_issued') {
      // 請求書の必須フィールド
      if (!body.counterparty || !body.subject || !body.issue_date) {
        return NextResponse.json(
          { error: 'Missing required fields: counterparty, subject, issue_date' },
          { status: 400 }
        );
      }
    } else if (doc_type === 'receipt') {
      // 領収書の必須フィールド
      if (!body.issuer || !body.receipt_date || !body.amount) {
        return NextResponse.json(
          { error: 'Missing required fields: issuer, receipt_date, amount' },
          { status: 400 }
        );
      }
    }

    // ドキュメント更新
    const updateData: any = {
      status: 'stored',
    };

    if (doc_type === 'invoice_issued') {
      updateData.counterparty = body.counterparty;
      updateData.subject = body.subject;
      updateData.issue_date = body.issue_date;
      updateData.invoice_number = body.invoice_number || null;
      updateData.amount = body.amount || null;
      updateData.currency = body.currency || 'JPY';
    } else if (doc_type === 'receipt') {
      updateData.issuer = body.issuer;
      updateData.receipt_date = body.receipt_date;
      updateData.amount = body.amount;
      updateData.currency = body.currency || 'JPY';
    }

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update document:', updateError);
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      );
    }

    // 監査ログ
    await supabaseAdmin.from('audit_logs').insert({
      document_id: id,
      action: 'confirm',
      metadata: {
        confirmedFields: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document confirmed and saved',
    });
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
