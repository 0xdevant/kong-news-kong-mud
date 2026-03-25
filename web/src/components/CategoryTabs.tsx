import type { CategoryInfo } from "../hooks/useArticles";

export default function CategoryTabs({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryInfo[];
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          active === null
            ? "btn-active"
            : "bg-elevated text-fg-muted hover:bg-card-hover"
        }`}
      >
        全部
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === c.id
              ? "btn-active"
              : "bg-elevated text-fg-muted hover:bg-card-hover"
          }`}
        >
          {c.label}
          <span className="text-fg-muted text-xs ml-1">({c.count})</span>
        </button>
      ))}
    </div>
  );
}
