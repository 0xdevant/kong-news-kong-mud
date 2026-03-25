import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Props {
  onBack: () => void;
}

export default function ContactPage({ onBack }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const resp = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await resp.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setSent(true);
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setError(data.error || "提交失敗，請稍後再試");
      }
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-lg font-bold text-fg">聯絡我哋</h1>
        </div>
      </header>

      <main className="px-4 py-6 text-sm text-fg">
        <p className="text-fg-muted mb-6 leading-relaxed">
          如有建議、想推薦 RSS 來源、或發現技術問題，歡迎填寫以下表格。我哋會視乎情況回覆。
        </p>

        {sent ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-2xl">✉️</p>
            <p className="font-medium text-base text-fg">多謝你嘅訊息！</p>
            <p className="text-fg-muted">我哋會盡快處理。</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium"
            >
              再發一封
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">
                稱呼
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="你嘅名"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-fg text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">
                電郵
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-fg text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">
                訊息
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="你嘅建議或問題…"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-fg text-sm resize-none placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            {error && <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {submitting ? "提交中…" : "發送訊息"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
