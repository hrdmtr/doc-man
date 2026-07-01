'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Doc = {
  id: string;
  doc_type: 'invoice_issued' | 'receipt';
  original_filename: string;
  counterparty: string | null;
  subject: string | null;
  issue_date: string | null;
  issuer: string | null;
  receipt_date: string | null;
  amount: number | null;
  currency: string;
  status: string;
  created_at: string;
};

const DOC_TYPE_LABEL: Record<string, string> = {
  invoice_issued: '請求書',
  receipt: '領収書',
};

const STATUS_LABEL: Record<string, string> = {
  uploaded: 'アップロード済み',
  parsed: '解析済み',
  needs_input: '入力待ち',
  failed: 'エラー',
};

type Tab = 'stored' | 'inbox';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('stored');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [inboxDocs, setInboxDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchInbox = useCallback(async () => {
    const results = await Promise.all(
      ['uploaded', 'parsed', 'needs_input', 'failed'].map((s) =>
        fetch(`/api/documents?status=${s}`).then((r) => r.json())
      )
    );
    const all = results.flatMap((r) => r.documents ?? []);
    all.sort((a: Doc, b: Doc) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setInboxDocs(all);
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (docType) params.set('doc_type', docType);
    if (keyword) {
      if (docType === 'receipt') params.set('issuer', keyword);
      else params.set('subject', keyword);
    }
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const [storedRes] = await Promise.all([
      fetch(`/api/documents?${params}`).then((r) => r.json()),
      fetchInbox(),
    ]);
    setDocs(storedRes.documents ?? []);
    setLoading(false);
  }, [docType, keyword, dateFrom, dateTo, fetchInbox]);

  useEffect(() => { search(); }, [search]);

  const dateOf = (doc: Doc) =>
    doc.doc_type === 'invoice_issued' ? doc.issue_date : doc.receipt_date;

  const nameOf = (doc: Doc) =>
    doc.doc_type === 'invoice_issued' ? doc.counterparty ?? '—' : doc.issuer ?? '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">書類一覧</h1>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <TabButton active={tab === 'stored'} onClick={() => setTab('stored')}>
          保存済み
        </TabButton>
        <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')}>
          処理中
          {inboxDocs.length > 0 && (
            <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
              {inboxDocs.length}
            </span>
          )}
        </TabButton>
      </div>

      {tab === 'stored' && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての種別</option>
              <option value="invoice_issued">請求書</option>
              <option value="receipt">領収書</option>
            </select>
            <input
              type="text"
              placeholder={docType === 'receipt' ? '発行元で検索' : '件名・宛先で検索'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center text-gray-400 text-sm">〜</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={search}
              className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center pt-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-sm">書類がありません</p>
              <Link href="/upload" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
                アップロードする
              </Link>
            </div>
          ) : (
            <DocTable docs={docs} nameOf={nameOf} dateOf={dateOf} />
          )}
        </>
      )}

      {tab === 'inbox' && (
        inboxDocs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-sm">処理待ちの書類はありません</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 text-xs">
                  <th className="px-4 py-3 font-medium">ファイル名</th>
                  <th className="px-4 py-3 font-medium">状態</th>
                  <th className="px-4 py-3 font-medium">アップロード日時</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {inboxDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                      {doc.original_filename}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        doc.status === 'failed'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {STATUS_LABEL[doc.status] ?? doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(doc.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/documents/${doc.id}/confirm`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        確認・入力
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function DocTable({ docs, nameOf, dateOf }: {
  docs: Doc[];
  nameOf: (d: Doc) => string;
  dateOf: (d: Doc) => string | null;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-gray-500 text-xs">
            <th className="px-4 py-3 font-medium">種別</th>
            <th className="px-4 py-3 font-medium">宛先/発行元</th>
            <th className="px-4 py-3 font-medium">件名/内容</th>
            <th className="px-4 py-3 font-medium">日付</th>
            <th className="px-4 py-3 font-medium text-right">金額</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr
              key={doc.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => { window.location.href = `/documents/${doc.id}`; }}
            >
              <td className="px-4 py-3">
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                  doc.doc_type === 'invoice_issued'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  {DOC_TYPE_LABEL[doc.doc_type]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900">{nameOf(doc)}</td>
              <td className="px-4 py-3 text-gray-600 max-w-48 truncate">
                {doc.subject ?? doc.original_filename}
              </td>
              <td className="px-4 py-3 text-gray-500">{dateOf(doc) ?? '—'}</td>
              <td className="px-4 py-3 text-right text-gray-900">
                {doc.amount != null ? `¥${doc.amount.toLocaleString()}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
