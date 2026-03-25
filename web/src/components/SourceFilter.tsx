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
      <p className="text-xs text-text-muted mb-2">來源</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`text-xs px-2.5 py-1 rounded-md ${
            active === null
              ? "bg-brand text-white"
              : "bg-gray-100 dark:bg-[#2a2a44] text-text-muted"
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
                : "bg-gray-100 dark:bg-[#2a2a44] text-text-muted"
            }`}
          >
            {s.source_name}{" "}
            <span className="opacity-75">({s.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
