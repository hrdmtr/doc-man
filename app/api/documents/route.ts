import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

type DocumentStatus = Database['public']['Tables']['documents']['Row']['status'];
type DocType = Database['public']['Tables']['documents']['Row']['doc_type'];

/**
 * GET /api/documents
 * ドキュメント検索
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const docType = searchParams.get('doc_type');
    const counterparty = searchParams.get('counterparty');
    const issuer = searchParams.get('issuer');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const subject = searchParams.get('subject');
    const status = (searchParams.get('status') || 'stored') as DocumentStatus;

    // クエリ構築
    let query = supabaseAdmin
      .from('documents')
      .select('*')
      .eq('status', status);

    if (docType) {
      query = query.eq('doc_type', docType as DocType);
    }

    if (counterparty) {
      query = query.ilike('counterparty', `%${counterparty}%`);
    }

    if (issuer) {
      query = query.ilike('issuer', `%${issuer}%`);
    }

    if (subject) {
      query = query.ilike('subject', `%${subject}%`);
    }

    if (dateFrom) {
      if (docType === 'invoice_issued' || !docType) {
        query = query.gte('issue_date', dateFrom);
      } else if (docType === 'receipt') {
        query = query.gte('receipt_date', dateFrom);
      }
    }

    if (dateTo) {
      if (docType === 'invoice_issued' || !docType) {
        query = query.lte('issue_date', dateTo);
      } else if (docType === 'receipt') {
        query = query.lte('receipt_date', dateTo);
      }
    }

    // 発行日/領収日で降順ソート
    if (docType === 'invoice_issued') {
      query = query.order('issue_date', { ascending: false });
    } else if (docType === 'receipt') {
      query = query.order('receipt_date', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Failed to search documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: documents || [],
      count: documents?.length || 0,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
