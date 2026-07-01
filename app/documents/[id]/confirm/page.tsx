'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

type Extraction = {
  field_name: string;
  candidate_value: string;
  confidence: number;
};

type Document = {
  id: string;
  doc_type: 'invoice_issued' | 'receipt';
  original_filename: string;
  status: string;
};

type TopCandidates = Record<string, string>;

function topCandidate(extractions: Extraction[], field: string): string {
  return extractions
    .filter((e) => e.field_name === field)
    .sort((a, b) => b.confidence - a.confidence)[0]?.candidate_value ?? '';
}

export default function ConfirmPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isManual = searchParams.get('manual') === 'true';

  const [document, setDocument] = useState<Document | null>(null);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [docType, setDocType] = useState<'invoice_issued' | 'receipt'>('invoice_issued');
  const [form, setForm] = useState<TopCandidates>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((r) => r.json())
      .then(({ document: doc, extractions: exts }) => {
        setDocument(doc);
        setExtractions(exts);
        const type = doc.doc_type as 'invoice_issued' | 'receipt';
        setDocType(type);
        if (type === 'invoice_issued') {
          setForm({
            counterparty: topCandidate(exts, 'counterparty'),
            subject: topCandidate(exts, 'subject'),
            issue_date: topCandidate(exts, 'issue_date'),
            invoice_number: topCandidate(exts, 'invoice_number'),
            amount: topCandidate(exts, 'amount'),
          });
        } else {
          setForm({
            issuer: topCandidate(exts, 'issuer'),
            receipt_date: topCandidate(exts, 'receipt_date'),
            amount: topCandidate(exts, 'amount'),
          });
        }
      })
      .catch(() => setError('データの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [id]);

  const candidates = (field: string) =>
    extractions
      .filter((e) => e.field_name === field)
      .sort((a, b) => b.confidence - a.confidence);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch(`/api/documents/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, doc_type: docType }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || '保存に失敗しました');
      setSaving(false);
      return;
    }

    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!document) {
    return <p className="text-red-500">{error || '書類が見つかりません'}</p>;
  }

  const isInvoice = docType === 'invoice_issued';

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-1">{document.original_filename}</p>
        <h1 className="text-xl font-semibold text-gray-900">タグの確認・入力</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        {/* 手動分類時または種別選択 */}
        {(isManual || true) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              書類種別<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex gap-3">
              {(['invoice_issued', 'receipt'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setDocType(t);
                    setForm({});
                  }}
                  className={`flex-1 text-sm py-2 rounded-md border transition-colors ${
                    docType === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'invoice_issued' ? '請求書（発行）' : '領収書'}
                </button>
              ))}
            </div>
          </div>
        )}

        {isInvoice ? (
          <>
            <Field
              label="宛先"
              required
              value={form.counterparty ?? ''}
              candidates={candidates('counterparty')}
              onChange={(v) => setForm((f) => ({ ...f, counterparty: v }))}
            />
            <Field
              label="件名"
              required
              value={form.subject ?? ''}
              candidates={candidates('subject')}
              onChange={(v) => setForm((f) => ({ ...f, subject: v }))}
            />
            <Field
              label="発行日"
              required
              type="date"
              value={form.issue_date ?? ''}
              candidates={candidates('issue_date')}
              onChange={(v) => setForm((f) => ({ ...f, issue_date: v }))}
            />
            <Field
              label="請求書番号"
              value={form.invoice_number ?? ''}
              candidates={candidates('invoice_number')}
              onChange={(v) => setForm((f) => ({ ...f, invoice_number: v }))}
            />
            <Field
              label="金額"
              type="number"
              value={form.amount ?? ''}
              candidates={candidates('amount')}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            />
          </>
        ) : (
          <>
            <Field
              label="発行元"
              required
              value={form.issuer ?? ''}
              candidates={candidates('issuer')}
              onChange={(v) => setForm((f) => ({ ...f, issuer: v }))}
            />
            <Field
              label="領収日"
              required
              type="date"
              value={form.receipt_date ?? ''}
              candidates={candidates('receipt_date')}
              onChange={(v) => setForm((f) => ({ ...f, receipt_date: v }))}
            />
            <Field
              label="金額"
              required
              type="number"
              value={form.amount ?? ''}
              candidates={candidates('amount')}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            />
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            戻る
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '確定して保存'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  candidates,
  onChange,
  type = 'text',
}: {
  label: string;
  required?: boolean;
  value: string;
  candidates: Extraction[];
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {candidates.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {candidates.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(c.candidate_value)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-0.5 rounded transition-colors"
            >
              {c.candidate_value}
              <span className="text-gray-400 ml-1">
                {Math.round(c.confidence * 100)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
