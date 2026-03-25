interface Props {
  onBack: () => void;
  onContact: () => void;
}

export default function AboutPage({ onBack, onContact }: Props) {
  return (
    <div className="min-h-screen max-w-2xl mx-auto pb-8">
      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="text-brand font-medium text-sm"
          >
            ← 返回
          </button>
          <h1 className="text-lg font-bold text-fg">關於我哋</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 text-sm text-fg leading-relaxed">
        <section>
          <h2 className="font-bold text-base mb-2 text-fg">香港媒體 RSS 係咩嚟？</h2>
          <p className="text-fg-muted">
            本站聚合香港多間媒體<strong>官方公開嘅 RSS 訂閱</strong>
            ，列出標題同極短摘要，方便你喺一個介面瀏覽最新消息；完整報道請前往各媒體網站閱讀，以支持原出版方。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">點解只用 RSS？</h2>
          <p className="text-fg-muted">
            RSS 係出版方主動提供嘅聯播格式，我哋唔會爬取網頁全文，尊重版權同各站條款。收錄嘅訂閱網址由本站設定，可随时增減。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">技術架構</h2>
          <p className="text-fg-muted">
            後端使用 Cloudflare Workers（Hono）同 D1 資料庫定時讀取訂閱；前端部署喺 Cloudflare Pages，透過同域 API 提供列表同搜尋。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">聯絡我哋</h2>
          <p className="text-fg-muted">
            如有建議、想通報訂閱問題或版權相關事宜，歡迎透過
            <button
              type="button"
              onClick={onContact}
              className="text-brand underline mx-1"
            >
              聯絡表格
            </button>
            聯絡我哋。
          </p>
        </section>
      </main>
    </div>
  );
}
