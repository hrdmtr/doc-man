import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "書類自動整理アップローダー",
  description: "請求書・領収書を自動で整理・タグ付けするシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
