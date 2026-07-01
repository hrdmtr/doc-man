/**
 * @jest-environment node
 */
const mockDocument = {
  id: 'test-doc-id',
  gcs_path: 'invoices/issued/2024/test_doc.pdf',
  original_filename: 'test_invoice.pdf',
};

const mockSignedUrl = 'https://storage.googleapis.com/test-bucket/signed-url?token=abc';
const mockFrom = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: { from: mockFrom },
}));

jest.mock('@/lib/gcs/upload', () => ({
  generateSignedUrl: jest.fn(async () => mockSignedUrl),
}));

beforeEach(() => {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: mockDocument, error: null }),
      }),
    }),
    insert: () => Promise.resolve({ error: null }),
  });
});

describe('GET /api/documents/[id]/download', () => {
  it('レスポンスに signedUrl キーが含まれ url キーは含まれない', async () => {
    const { GET } = await import('@/app/api/documents/[id]/download/route');

    const req = new Request('http://localhost/api/documents/test-doc-id/download');
    const response = await GET(req as never, {
      params: Promise.resolve({ id: 'test-doc-id' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    // ダウンロードボタンのバグ修正確認: url ではなく signedUrl で返す
    expect(body.signedUrl).toBe(mockSignedUrl);
    expect(body).not.toHaveProperty('url');
    expect(body.filename).toBe(mockDocument.original_filename);
    expect(body.expiresIn).toBe(3600);
  });

  it('存在しないIDは404を返す', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'not found' } }),
        }),
      }),
    });

    const { GET } = await import('@/app/api/documents/[id]/download/route');
    const req = new Request('http://localhost/api/documents/nonexistent/download');
    const response = await GET(req as never, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
  });
});
