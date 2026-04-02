import { useState, useCallback } from "react";

export default function SearchBar({
  onSearch,
  searching,
}: {
  onSearch: (q: string) => void;
  searching: boolean;
}) {
  const [q, setQ] = useState("");

  const submit = useCallback(() => {
    onSearch(q.trim());
  }, [q, onSearch]);

  return (
    <div className="px-4 pb-2 sm:pb-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.length < 2) onSearch("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="搜尋標題或摘要…"
          aria-busy={searching}
          className="flex-1 rounded-lg border border-border px-3 py-1.5 sm:py-2 text-sm bg-surface text-fg placeholder:text-fg-muted shadow-inner shadow-black/[0.04] dark:shadow-none dark:bg-card"
        />
        <button
          type="button"
          onClick={submit}
          disabled={searching}
          className="shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-brand text-white text-sm font-medium shadow-sm shadow-black/15 hover:opacity-90 active:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {searching ? "…" : "搜尋"}
        </button>
      </div>
    </div>
  );
}
