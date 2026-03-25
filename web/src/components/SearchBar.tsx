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
    <div className="px-4 pb-3">
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
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm bg-surface text-fg placeholder:text-fg-muted dark:bg-[#1e1e36]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={searching}
          className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-50"
        >
          {searching ? "…" : "搜尋"}
        </button>
      </div>
    </div>
  );
}
