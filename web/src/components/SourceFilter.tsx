import type { SourceInfo } from "../hooks/useArticles";

export default function SourceFilter({
  sources,
  active,
  onSelect,
}: {
  sources: SourceInfo[];
  active: string | null;
  onSelect: (name: string | null) => void;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="px-4 pb-3">
      <p className="text-xs text-fg-muted mb-2">來源</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`text-xs px-2.5 py-1 rounded-md ${
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
            className={`text-xs px-2.5 py-1 rounded-md ${
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
