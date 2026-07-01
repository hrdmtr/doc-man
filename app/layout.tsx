import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "書類管理",
  description: "請求書・領収書を自動で整理・タグ付けするシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <Link href="/" className="font-semibold text-gray-900 hover:text-gray-700">
                書類管理
              </Link>
              <span className="text-xs text-gray-400 font-mono">
                {process.env.NEXT_PUBLIC_VERSION ?? 'dev'}
              </span>
            </div>
            <Link
              href="/upload"
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              アップロード
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
