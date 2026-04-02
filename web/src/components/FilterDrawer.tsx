import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * 手機篩選底部抽屜 — 效能取向：
 * - 用 createPortal 掛去 document.body，避免父層 stacking / transform 影響 fixed
 * - 唔用 backdrop-blur（行機好食力），改較實色遮罩
 * - 面板 contain + GPU layer，減少合成範圍
 * 由 App 僅喺開啟時 mount，閂咗完全卸載。
 */
export default function FilterDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) onClose();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] md:hidden flex flex-col justify-end isolate pointer-events-auto"
      aria-modal
      role="dialog"
      aria-labelledby="filter-drawer-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/70 dark:bg-black/80"
        aria-label="關閉篩選"
        onClick={onClose}
      />
      <div
        className="relative z-10 mt-auto max-h-[min(88dvh,720px)] min-h-[38vh] flex flex-col rounded-t-[1.25rem] bg-surface text-fg border-t-2 border-x border-brand/25 dark:border-brand/35 border-b-0 shadow-xl ring-1 ring-fg/10 dark:ring-white/15 transform-gpu"
      >
        <div
          className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-fg/25 dark:bg-white/35"
          aria-hidden
        />
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-3 border-b border-border bg-surface shrink-0">
          <h2
            id="filter-drawer-title"
            className="text-lg font-semibold text-fg tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-full hover:bg-elevated dark:hover:bg-card-hover transition-colors"
            aria-label="關閉"
          >
            <svg
              className="w-5 h-5 text-fg-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain touch-pan-y min-h-0 flex-1 bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))] [scrollbar-gutter:stable]">
          {children}
        </div>
        <div className="shrink-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border bg-surface-alt dark:bg-card">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-brand text-white text-base font-semibold shadow-md shadow-brand/25 hover:opacity-95 active:opacity-90 transition-opacity"
          >
            完成
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
