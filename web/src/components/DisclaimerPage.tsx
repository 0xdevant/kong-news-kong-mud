interface Props {
  onBack: () => void;
  onContact: () => void;
}

export default function DisclaimerPage({ onBack, onContact }: Props) {
  return (
    <div className="min-h-screen max-w-2xl mx-auto pb-8">
      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="text-accent font-medium text-sm"
          >
            ← 返回
          </button>
          <h1 className="text-lg font-bold text-fg">免責聲明</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 text-sm text-fg leading-relaxed">
        <section>
          <h2 className="font-bold text-base mb-2 text-fg">資料來源與版權</h2>
          <p className="text-fg-muted">
            本網站為<strong>新聞標題與摘要嘅聚合介面</strong>
            ，所列出嘅內容、商標及完整文章均屬各媒體及原網站所有。本站僅透過各出版方提供嘅 RSS
            顯示極短摘錄並提供連結至原文；一切報道以媒體官方發佈為準。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">非商業立場</h2>
          <p className="text-fg-muted">
            本網站與所展示嘅任何媒體、機構或品牌並無必然商業合作關係。資訊只作參考，不構成任何法律、投資或行為建議。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">資料準確性</h2>
          <p className="text-fg-muted">
            我哋盡力確保訂閱資料及顯示內容合理，但 RSS
            由第三方提供，可能出現延誤、遺漏或錯誤。讀者請一律以原網站全文及更新為準。本網站對因使用本站而引致之任何損失概不負責。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">連結至原文</h2>
          <p className="text-fg-muted">
            本站提供前往各媒體網站嘅直接連結，目的係方便瀏覽並為原站帶來流量。請支持正版新聞來源。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">內容移除</h2>
          <p className="text-fg-muted">
            若你係相關內容嘅權利人並希望處理顯示方式，請透過
            <button
              type="button"
              onClick={onContact}
              className="text-accent underline mx-1"
            >
              聯絡表格
            </button>
            通知我哋。
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2 text-fg">外部連結</h2>
          <p className="text-fg-muted">
            本站載有前往第三方網站嘅連結。我哋對該等網站之內容、私隱政策或做法概不負責；瀏覽及使用風險由用戶自行承擔。
          </p>
        </section>
      </main>
    </div>
  );
}
