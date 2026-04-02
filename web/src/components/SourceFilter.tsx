import type { SourceInfo } from "../hooks/useArticles";

export default function SourceFilter({
  sources,
  active,
  onSelect,
  variant = "default",
}: {
  sources: SourceInfo[];
  active: string | null;
  onSelect: (name: string | null) => void;
  /** `drawer`：底部抽屜內用，chips 多行換行唔用橫向捲 */
  variant?: "default" | "drawer";
}) {
  if (sources.length === 0) return null;
  const isDrawer = variant === "drawer";
  return (
    <div className={isDrawer ? "px-4 pb-4" : "px-4 pb-2 sm:pb-3"}>
      <p
        className={
          isDrawer
            ? "text-xs text-fg-muted mb-2"
            : "text-[11px] sm:text-xs text-fg-muted mb-1 sm:mb-2"
        }
      >
        來源
      </p>
      <div
        className={
          isDrawer
            ? "flex flex-wrap gap-2"
            : "flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x -mx-4 px-4 pb-0.5 [scrollbar-width:thin]"
        }
      >
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`shrink-0 text-xs px-2.5 py-1 rounded-md ${
            active === null
              ? "bg-brand text-white"
              : "bg-elevated text-fg-muted dark:hover:bg-card-hover"
          }`}
        >
          全部
        </button>
        {sources.map((s) => (
          <button
            key={s.source_name}
            type="button"
            onClick={() => onSelect(s.source_name)}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-md ${
              active === s.source_name
                ? "bg-brand text-white"
                : "bg-elevated text-fg-muted dark:hover:bg-card-hover"
            }`}
          >
            {s.source_name}{" "}
            <span
              className={`tabular-nums ${
                active === s.source_name
                  ? "text-white/90"
                  : "text-fg/80 dark:text-fg-muted"
              }`}
            >
              ({s.count})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
