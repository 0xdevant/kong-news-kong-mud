import type { CategoryInfo } from "../hooks/useArticles";

/** 與 ho-lou-sou (`~/Desktop/ho-lou-sou`) `CategoryTabs` + `/api/init` 的 `icon` 欄位一致：emoji + 五欄 grid + `bg-brand/10` 選中 */
const ALL_ICON = "🔥";

export default function CategoryTabs({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryInfo[];
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  const items = [
    { id: null as string | null, icon: ALL_ICON, label: "全部", count: 0 },
    ...categories.map((c) => ({
      id: c.id,
      icon: c.icon ?? "📌",
      label: c.label,
      count: c.count,
    })),
  ];

  return (
    <div className="grid grid-cols-5 gap-0.5 sm:gap-1 px-4 pt-2 pb-0.5 sm:pt-3 sm:pb-1 md:pb-3">
      {items.map((cat) => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id ?? "__all"}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all min-h-[44px] sm:min-h-0 justify-center ${
              isActive
                ? "bg-brand/10"
                : "hover:bg-gray-50 dark:hover:bg-card-hover"
            }`}
          >
            <span
              className={`text-xl sm:text-2xl leading-none transition-transform ${isActive ? "sm:scale-110" : ""}`}
            >
              {cat.icon}
            </span>
            <span
              className={`font-medium leading-tight text-center ${
                isActive ? "text-brand" : "text-fg-muted"
              } ${
                cat.label && cat.label.length > 4
                  ? "text-[9px] min-[400px]:text-[11px]"
                  : "text-[10px] sm:text-[11px]"
              }`}
            >
              {cat.label}
            </span>
            {cat.count > 0 && (
              <span
                className={`text-[9px] sm:text-[10px] leading-none ${
                  isActive ? "text-brand/70" : "text-fg-muted/50"
                }`}
              >
                {cat.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
