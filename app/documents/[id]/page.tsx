'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Doc = {
  id: string;
  doc_type: 'invoice_issued' | 'receipt';
  original_filename: string;
  counterparty: string | null;
  subject: string | null;
  issue_date: string | null;
  invoice_number: string | null;
  issuer: string | null;
  receipt_date: string | null;
  amount: number | null;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type AuditLog = {
  id: string;
  action: string;
  timestamp: string;
};

const ACTION_LABEL: Record<string, string> = {
  upload: 'アップロード',
  parse: '解析',
  confirm: '確定保存',
  edit: '編集',
  download: 'ダウンロード',
};

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then(({ document, auditLogs: logs }) => {
        setDoc(document);
        setAuditLogs(logs ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    const res = await fetch(`/api/documents/${id}/download`);
    const data = await res.json();
    if (data.url) {
      window.open(data.url, '_blank');
    }
    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>書類が見つかりません</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 inline-block">一覧へ戻る</Link>
      </div>
    );
  }

  const isInvoice = doc.doc_type === 'invoice_issued';

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 戻る
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${
              isInvoice ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
            }`}>
              {isInvoice ? '請求書（発行）' : '領収書'}
            </span>
            <p className="text-xs text-gray-400">{doc.original_filename}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/documents/${id}/confirm`}
              className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
            >
              編集
            </Link>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {downloading ? '取得中...' : 'ダウンロード'}
            </button>
          </div>
        </div>

        <dl className="space-y-3">
          {isInvoice ? (
            <>
              <Field label="宛先" value={doc.counterparty} />
              <Field label="件名" value={doc.subject} />
              <Field label="発行日" value={doc.issue_date} />
              <Field label="請求書番号" value={doc.invoice_number} />
              <Field label="金額" value={doc.amount != null ? `¥${doc.amount.toLocaleString()} ${doc.currency}` : null} />
            </>
          ) : (
            <>
              <Field label="発行元" value={doc.issuer} />
              <Field label="領収日" value={doc.receipt_date} />
              <Field label="金額" value={doc.amount != null ? `¥${doc.amount.toLocaleString()} ${doc.currency}` : null} />
            </>
          )}
        </dl>
      </div>

      {auditLogs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">操作履歴</h2>
          <ul className="space-y-2">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex justify-between text-xs text-gray-500">
                <span>{ACTION_LABEL[log.action] ?? log.action}</span>
                <span>{new Date(log.timestamp).toLocaleString('ja-JP')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-4">
      <dt className="text-sm text-gray-500 w-24 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}
