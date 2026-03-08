export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          doc_type: 'invoice_issued' | 'receipt'
          original_filename: string
          mime_type: string
          size_bytes: number
          content_hash: string | null
          gcs_bucket: string
          gcs_path: string
          status: 'uploaded' | 'parsed' | 'needs_input' | 'stored' | 'failed'
          counterparty: string | null
          subject: string | null
          issue_date: string | null
          invoice_number: string | null
          issuer: string | null
          receipt_date: string | null
          amount: number | null
          currency: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doc_type: 'invoice_issued' | 'receipt'
          original_filename: string
          mime_type: string
          size_bytes: number
          content_hash?: string | null
          gcs_bucket: string
          gcs_path: string
          status?: 'uploaded' | 'parsed' | 'needs_input' | 'stored' | 'failed'
          counterparty?: string | null
          subject?: string | null
          issue_date?: string | null
          invoice_number?: string | null
          issuer?: string | null
          receipt_date?: string | null
          amount?: number | null
          currency?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doc_type?: 'invoice_issued' | 'receipt'
          original_filename?: string
          mime_type?: string
          size_bytes?: number
          content_hash?: string | null
          gcs_bucket?: string
          gcs_path?: string
          status?: 'uploaded' | 'parsed' | 'needs_input' | 'stored' | 'failed'
          counterparty?: string | null
          subject?: string | null
          issue_date?: string | null
          invoice_number?: string | null
          issuer?: string | null
          receipt_date?: string | null
          amount?: number | null
          currency?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      extraction_results: {
        Row: {
          id: string
          document_id: string
          field_name: string
          candidate_value: string | null
          confidence: number | null
          source: 'pdf_text' | 'ocr' | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          field_name: string
          candidate_value?: string | null
          confidence?: number | null
          source?: 'pdf_text' | 'ocr' | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          field_name?: string
          candidate_value?: string | null
          confidence?: number | null
          source?: 'pdf_text' | 'ocr' | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          document_id: string
          action: 'upload' | 'parse' | 'confirm' | 'edit' | 'download'
          actor: string | null
          timestamp: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          document_id: string
          action: 'upload' | 'parse' | 'confirm' | 'edit' | 'download'
          actor?: string | null
          timestamp?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          document_id?: string
          action?: 'upload' | 'parse' | 'confirm' | 'edit' | 'download'
          actor?: string | null
          timestamp?: string
          metadata?: Json | null
        }
      }
    }
  }
}
