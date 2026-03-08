'use client';

import { useState } from 'react';

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. ファイルアップロードテスト
  const handleUpload = async () => {
    if (!file) {
      alert('ファイルを選択してください');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);

      if (data.document?.id) {
        setDocumentId(data.document.id);
      }
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 2. PDF解析テスト
  const handleParse = async () => {
    if (!documentId) {
      alert('ドキュメントIDを入力してください');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/parse`, {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 3. ドキュメント詳細取得テスト
  const handleGetDocument = async () => {
    if (!documentId) {
      alert('ドキュメントIDを入力してください');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  // 4. 検索テスト
  const handleSearch = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/documents?status=stored');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API動作確認ページ</h1>

        {/* ファイルアップロード */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. PDFアップロード</h2>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            アップロード
          </button>
        </div>

        {/* PDF解析 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. PDF解析</h2>
          <input
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="ドキュメントID"
            className="border rounded px-3 py-2 w-full mb-4"
          />
          <button
            onClick={handleParse}
            disabled={loading || !documentId}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            解析実行
          </button>
        </div>

        {/* ドキュメント詳細取得 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">3. ドキュメント詳細取得</h2>
          <button
            onClick={handleGetDocument}
            disabled={loading || !documentId}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            詳細取得
          </button>
        </div>

        {/* 検索 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">4. ドキュメント検索</h2>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-400"
          >
            保存済み書類を検索
          </button>
        </div>

        {/* 結果表示 */}
        {loading && (
          <div className="bg-gray-100 rounded-lg p-6">
            <p className="text-center">処理中...</p>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">結果</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
