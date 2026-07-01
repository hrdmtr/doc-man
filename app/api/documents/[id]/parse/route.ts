import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { downloadPDF } from '@/lib/gcs/upload';
import { parsePDF, classifyDocumentType, extractInvoiceData, extractReceiptData } from '@/lib/pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/documents/[id]/parse
 * PDFを解析してデータを抽出
 */
export async function POST(
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

    if (document.status === 'stored') {
      return NextResponse.json(
        { error: 'Document already confirmed' },
        { status: 400 }
      );
    }
    // needs_input / failed / uploaded は再解析可能

    // GCSからPDFダウンロード
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await downloadPDF(document.gcs_path);
    } catch (error) {
      console.error('Failed to download PDF from GCS:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve PDF file' },
        { status: 500 }
      );
    }

    // PDFパース
    let parsedData;
    try {
      parsedData = await parsePDF(pdfBuffer);
    } catch (error) {
      // パース失敗
      await supabaseAdmin
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', id);

      await supabaseAdmin.from('audit_logs').insert({
        document_id: id,
        action: 'parse',
        metadata: {
          error: error instanceof Error ? error.message : 'Parse failed',
          success: false,
        },
      });

      return NextResponse.json(
        { error: 'Failed to parse PDF. The file may be image-based or corrupted.' },
        { status: 422 }
      );
    }

    // ドキュメントタイプ分類
    const classification = classifyDocumentType(parsedData);

    if (classification.docType === 'unknown') {
      await supabaseAdmin
        .from('documents')
        .update({ status: 'needs_input' })
        .eq('id', id);
      return NextResponse.json(
        { error: 'Unable to classify document type. Please specify manually.' },
        { status: 422 }
      );
    }

    // データ抽出
    const extractionData = classification.docType === 'invoice_issued'
      ? extractInvoiceData(parsedData)
      : extractReceiptData(parsedData);

    // 抽出結果をDBに保存
    const extractionRecords = [];

    for (const [fieldName, candidates] of Object.entries(extractionData)) {
      for (const candidate of candidates) {
        extractionRecords.push({
          document_id: id,
          field_name: fieldName,
          candidate_value: candidate.candidateValue,
          confidence: candidate.confidence,
          source: candidate.source,
        });
      }
    }

    if (extractionRecords.length > 0) {
      await supabaseAdmin
        .from('extraction_results')
        .insert(extractionRecords);
    }

    // ドキュメント更新
    await supabaseAdmin
      .from('documents')
      .update({
        doc_type: classification.docType,
        status: 'parsed',
      })
      .eq('id', id);

    // 監査ログ
    await supabaseAdmin.from('audit_logs').insert({
      document_id: id,
      action: 'parse',
      metadata: {
        docType: classification.docType,
        confidence: classification.confidence,
        extractionCount: extractionRecords.length,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      docType: classification.docType,
      confidence: classification.confidence,
      extractions: extractionData,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
