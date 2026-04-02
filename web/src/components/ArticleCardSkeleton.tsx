/** 與 ArticleCard 版面一致，用於首屏載入／搜尋中 */
export default function ArticleCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-pulse">
      <div className="aspect-[2/1] w-full bg-elevated dark:bg-elevated" />
      <div className="p-4 pt-3 space-y-2">
        <div className="flex gap-2">
          <div className="h-3 w-20 rounded bg-elevated" />
          <div className="h-3 w-12 rounded bg-elevated" />
        </div>
        <div className="h-4 w-full rounded bg-elevated" />
        <div className="h-4 w-[92%] rounded bg-elevated" />
        <div className="h-3 w-full rounded bg-elevated opacity-70" />
      </div>
    </div>
  );
}
