/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-doc-id' }),
  useRouter: () => ({ back: jest.fn() }),
}));

const mockDocument = {
  id: 'test-doc-id',
  doc_type: 'invoice_issued',
  original_filename: 'invoice_2024.pdf',
  counterparty: '株式会社テスト',
  subject: 'テスト請求',
  issue_date: '2024-01-15',
  invoice_number: 'INV-001',
  issuer: null,
  receipt_date: null,
  amount: 100000,
  currency: 'JPY',
  status: 'stored',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockSignedUrl = 'https://storage.googleapis.com/bucket/signed?token=xyz';

describe('書類詳細画面 ダウンロードボタン', () => {
  let clickedHref: string;
  let clickedDownload: string;

  beforeEach(() => {
    clickedHref = '';
    clickedDownload = '';

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/download')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            signedUrl: mockSignedUrl,
            filename: mockDocument.original_filename,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          document: mockDocument,
          extractions: [],
          auditLogs: [],
        }),
      });
    }) as jest.Mock;

    // アンカー生成をスパイ（無限再帰を避けるため createElement はスパイせず appendChild で捕捉）
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', {
          value: jest.fn().mockImplementation(() => {
            clickedHref = (el as HTMLAnchorElement).href;
            clickedDownload = (el as HTMLAnchorElement).download;
          }),
          writable: true,
        });
      }
      return el;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ダウンロードボタンクリックで signedUrl が使われる', async () => {
    const { default: DocumentDetailPage } = await import('@/app/documents/[id]/page');
    render(<DocumentDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('ダウンロード')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ダウンロード'));

    await waitFor(() => {
      // signedUrl がアンカーの href に使われていること
      expect(clickedHref).toContain('storage.googleapis.com');
      // 旧バグ (data.url) では clickedHref が空になる
      expect(clickedHref).not.toBe('');
      expect(clickedDownload).toBe(mockDocument.original_filename);
    });
  });

  it('ダウンロードAPIが正しいエンドポイントを呼ぶ', async () => {
    const { default: DocumentDetailPage } = await import('@/app/documents/[id]/page');
    render(<DocumentDetailPage />);

    await waitFor(() => screen.getByText('ダウンロード'));
    fireEvent.click(screen.getByText('ダウンロード'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/documents/test-doc-id/download')
      );
    });
  });
});
