export default function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-brand mb-6"
      >
        ← 返回
      </button>
      <h1 className="text-2xl font-bold mb-4">關於本站</h1>
      <div className="prose dark:prose-invert text-text-muted space-y-4 text-sm leading-relaxed">
        <p>
          本站只讀取各媒體<strong>公開提供的 RSS／Atom 訂閱</strong>
          ，列出標題與簡短摘要，方便一站式瀏覽。
        </p>
        <p>
          完整內容、版權與廣告收益均屬於原出版方。請點擊「前往原文」在對方網站閱讀，以支持該媒體。
        </p>
        <p>
          本站不進行網頁爬蟲抓取全文；收錄範圍以設定中的訂閱網址為準，可随时增減。
        </p>
      </div>
    </div>
  );
}
