export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          書類自動整理アップローダー
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          請求書・領収書を自動で整理・タグ付けするシステム（MVP開発中）
        </p>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">開発状況</h2>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              プロジェクト基盤セットアップ
            </li>
            <li className="flex items-center">
              <span className="text-gray-400 mr-2">○</span>
              Supabase連携
            </li>
            <li className="flex items-center">
              <span className="text-gray-400 mr-2">○</span>
              Google Cloud Storage連携
            </li>
            <li className="flex items-center">
              <span className="text-gray-400 mr-2">○</span>
              PDF解析機能
            </li>
            <li className="flex items-center">
              <span className="text-gray-400 mr-2">○</span>
              アップロード機能
            </li>
            <li className="flex items-center">
              <span className="text-gray-400 mr-2">○</span>
              検索機能
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
