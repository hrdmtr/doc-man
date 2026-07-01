'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setErrorMessage('PDFファイルのみ対応しています');
      setStep('error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('ファイルサイズは5MB以下にしてください');
      setStep('error');
      return;
    }

    setFileName(file.name);
    setStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        if (uploadRes.status === 409) {
          router.push(`/documents/${uploadData.existingDocument.id}`);
          return;
        }
        setErrorMessage(uploadData.error || 'アップロードに失敗しました');
        setStep('error');
        return;
      }

      const documentId = uploadData.document.id;
      setStep('parsing');

      const parseRes = await fetch(`/api/documents/${documentId}/parse`, {
        method: 'POST',
      });

      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        // 分類失敗(422)はアップロード済みなので確認画面で手動入力へ
        if (parseRes.status === 422) {
          setStep('done');
          router.push(`/documents/${documentId}/confirm?manual=true`);
          return;
        }
        setErrorMessage(parseData.error || '解析に失敗しました');
        setStep('error');
        return;
      }

      setStep('done');
      router.push(`/documents/${documentId}/confirm`);
    } catch {
      setErrorMessage('ネットワークエラーが発生しました');
      setStep('error');
    }
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const reset = () => {
    setStep('idle');
    setErrorMessage('');
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">書類アップロード</h1>

      {step === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          <div className="text-4xl mb-4">📄</div>
          <p className="text-gray-700 font-medium mb-1">
            PDFをドラッグ＆ドロップ
          </p>
          <p className="text-sm text-gray-400">またはクリックして選択</p>
          <p className="text-xs text-gray-400 mt-3">PDF のみ・最大 5MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {(step === 'uploading' || step === 'parsing' || step === 'done') && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-500 mb-1 truncate">{fileName}</p>
          <div className="space-y-2 mt-4">
            <Step label="アップロード" done={step !== 'uploading'} active={step === 'uploading'} />
            <Step label="解析中" done={step === 'done'} active={step === 'parsing'} pending={step === 'uploading'} />
            <Step label="タグ確認へ移動" done={false} active={step === 'done'} pending={step !== 'done'} />
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-600 font-medium mb-1">エラーが発生しました</p>
          <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
          <button
            onClick={reset}
            className="bg-blue-600 text-white text-sm px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
}

function Step({
  label,
  done,
  active,
  pending,
}: {
  label: string;
  done: boolean;
  active?: boolean;
  pending?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm justify-center ${
      done ? 'text-green-600' : active ? 'text-blue-600 font-medium' : 'text-gray-300'
    }`}>
      <span>{done ? '✓' : active ? '→' : '·'}</span>
      <span>{label}</span>
    </div>
  );
}
