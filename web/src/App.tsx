import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  lazy,
  Suspense,
} from "react";
import { useArticles, useInit, useSearch } from "./hooks/useArticles";
import { useFavourites } from "./hooks/useFavourites";
import { useTheme } from "./hooks/useTheme";
import CategoryTabs from "./components/CategoryTabs";
import SourceFilter from "./components/SourceFilter";
import ArticleList from "./components/ArticleList";

const FilterDrawer = lazy(() => import("./components/FilterDrawer"));
import SearchBar from "./components/SearchBar";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import DisclaimerPage from "./components/DisclaimerPage";
import { isSearchQueryAllowed } from "./utils/searchQuery";

/** Same-origin `/api` in dev (Vite proxy); set `VITE_API_URL` for prod web pointing at Worker. */
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFavs, setShowFavs] = useState(false);
  const [page, setPage] = useState<
    "home" | "about" | "contact" | "disclaimer"
  >("home");
  const { toggle: toggleFav, isFav, count: favCount } = useFavourites();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const closeFilterDrawer = useCallback(() => setFilterDrawerOpen(false), []);
  const prefetchFilterDrawer = useCallback(() => {
    void import("./components/FilterDrawer");
  }, []);

  const { categories, sources, refreshInit } = useInit();
  const {
    articles: feedArticles,
    loading,
    error,
    refresh,
  } = useArticles(
    activeCategory || undefined,
    activeSource || undefined,
  );
  const { results: searchResults, searching, search } = useSearch();

  const handleSearch = useCallback(
    (q: string) => {
      setIsSearching(isSearchQueryAllowed(q.trim()));
      search(q);
    },
    [search],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (import.meta.env.DEV) {
        const r = await fetch(`${API_BASE}/api/refresh`, { method: "POST" });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.warn(
            "POST /api/refresh failed (若設咗 REFRESH_SECRET，請用終端 npm run refresh:local)",
            r.status,
            err,
          );
        }
      }
      await Promise.all([refresh(), refreshInit()]);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  };

  const favedFeed =
    showFavs && !isSearching
      ? feedArticles.filter((a) => isFav(a.id))
      : feedArticles;
  const displayArticles = isSearching ? searchResults : favedFeed;

  const categorySummary = useMemo(() => {
    if (activeCategory === null) return { label: "全部", icon: "🔥" as string };
    const c = categories.find((x) => x.id === activeCategory);
    return { label: c?.label ?? "全部", icon: c?.icon ?? "📌" };
  }, [activeCategory, categories]);
  const sourceSummaryLabel =
    activeSource === null ? "全部來源" : activeSource;

  const skipFilterScrollRef = useRef(true);
  useEffect(() => {
    if (skipFilterScrollRef.current) {
      skipFilterScrollRef.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeCategory, activeSource]);

  if (page === "about")
    return (
      <AboutPage
        onBack={() => setPage("home")}
        onContact={() => setPage("contact")}
      />
    );
  if (page === "contact")
    return <ContactPage onBack={() => setPage("home")} />;
  if (page === "disclaimer")
    return (
      <DisclaimerPage
        onBack={() => setPage("home")}
        onContact={() => setPage("contact")}
      />
    );

  return (
    <div className="min-h-screen max-w-4xl mx-auto pb-8">
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-2 sm:py-3">
          <button
            type="button"
            onClick={() => {
              setPage("home");
              setActiveCategory(null);
              setActiveSource(null);
              setIsSearching(false);
              setShowFavs(false);
            }}
            className="text-left flex items-center gap-2 sm:gap-3 min-w-0"
          >
            <img
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shrink-0 object-contain"
              decoding="async"
              aria-hidden
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-fg tracking-tight">
                港聞講乜
              </h1>
              <p className="text-xs text-fg-muted hidden sm:block">
                香港本地媒體新聞一覽 · 點擊前往原文
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-elevated dark:hover:bg-card-hover transition-colors"
              aria-label={isDark ? "切換至淺色主題" : "切換至深色主題"}
              title={isDark ? "切換淺色／深色主題（而家：深色）" : "切換淺色／深色主題（而家：淺色）"}
            >
              {isDark ? (
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
                    d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
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
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowFavs((f) => !f)}
              className={`relative p-2 rounded-full transition-colors ${showFavs ? "bg-red-500/15 dark:bg-red-500/20" : "hover:bg-elevated dark:hover:bg-card-hover"}`}
              aria-label={showFavs ? "顯示全部文章" : "只顯示已收藏文章"}
              title="只顯示已收藏文章（再撳一次返回全部）"
            >
              <svg
                className={`w-5 h-5 ${showFavs ? "text-red-500 fill-red-500" : "text-fg-muted"}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                fill={showFavs ? "currentColor" : "none"}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {favCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {favCount > 99 ? "99" : favCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-full hover:bg-elevated dark:hover:bg-card-hover disabled:opacity-50 transition-colors"
              aria-label={
                import.meta.env.DEV
                  ? "重新整理（本機會先拉取 RSS 再更新列表）"
                  : "重新整理列表"
              }
              title={
                import.meta.env.DEV
                  ? "重新整理：本機會先 POST /api/refresh 拉 RSS，再更新列表"
                  : "重新整理：向伺服器載入最新文章列表"
              }
            >
              <svg
                className={`w-5 h-5 text-fg-muted${refreshing ? " animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h5M20 20v-5h-5M4.5 9A8 8 0 0120 12M19.5 15A8 8 0 014 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <SearchBar onSearch={handleSearch} searching={searching} />

        {!isSearching && (
          <>
            <div className="hidden md:block">
              <CategoryTabs
                categories={categories}
                active={activeCategory}
                onSelect={(id) => {
                  setActiveCategory(id);
                  setActiveSource(null);
                }}
              />
              <SourceFilter
                sources={sources}
                active={activeSource}
                onSelect={setActiveSource}
              />
            </div>

            <div className="md:hidden px-4 pb-2">
              <button
                type="button"
                onPointerDown={prefetchFilterDrawer}
                onClick={() => setFilterDrawerOpen(true)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-elevated/80 dark:bg-card/50 px-3 py-2.5 text-left min-h-[44px] active:bg-elevated dark:active:bg-card-hover transition-colors"
                aria-expanded={filterDrawerOpen}
                aria-haspopup="dialog"
              >
                <span className="min-w-0 flex items-center gap-2 text-sm">
                  <span
                    className="text-lg leading-none shrink-0"
                    aria-hidden
                  >
                    {categorySummary.icon}
                  </span>
                  <span className="truncate">
                    <span className="text-fg-muted font-normal">分類</span>{" "}
                    <span className="font-medium text-fg">
                      {categorySummary.label}
                    </span>
                    <span className="text-fg-muted mx-1">·</span>
                    <span className="text-fg-muted font-normal">來源</span>{" "}
                    <span className="font-medium text-fg">
                      {sourceSummaryLabel}
                    </span>
                  </span>
                </span>
                <svg
                  className="w-5 h-5 text-fg-muted shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </button>
            </div>

            {filterDrawerOpen && (
              <Suspense
                fallback={
                  <button
                    type="button"
                    className="fixed inset-0 z-[100] md:hidden bg-black/70 dark:bg-black/80 cursor-default"
                    aria-busy="true"
                    aria-label="載入篩選中，點擊關閉"
                    onClick={closeFilterDrawer}
                  />
                }
              >
                <FilterDrawer
                  title="分類與來源"
                  onClose={closeFilterDrawer}
                >
                  <CategoryTabs
                    categories={categories}
                    active={activeCategory}
                    onSelect={(id) => {
                      setActiveCategory(id);
                      setActiveSource(null);
                    }}
                  />
                  <SourceFilter
                    variant="drawer"
                    sources={sources}
                    active={activeSource}
                    onSelect={setActiveSource}
                  />
                </FilterDrawer>
              </Suspense>
            )}
          </>
        )}
      </header>

      <main>
        {isSearching && searchResults.length > 0 && (
          <p className="px-4 pt-3 text-sm text-fg-muted">
            找到 {searchResults.length} 則
          </p>
        )}
        <ArticleList
          articles={displayArticles}
          loading={
            (isSearching && searching) ||
            (!isSearching && loading)
          }
          error={isSearching ? null : error}
          emptyMessage={
            showFavs && !isSearching
              ? "暫無收藏"
              : isSearching && !searching && searchResults.length === 0
                ? "搵唔到結果，試下其他關鍵字"
                : undefined
          }
          isFav={isFav}
          onToggleFav={toggleFav}
          onRetry={isSearching ? undefined : refresh}
        />
      </main>

      <footer className="text-center py-8 text-xs text-fg-muted space-y-2 px-4">
        <p>內容來自各媒體公開 RSS，版權歸原出版方。</p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => setPage("about")}
            className="underline hover:text-fg"
          >
            關於我哋
          </button>
          <span className="opacity-50">·</span>
          <button
            type="button"
            onClick={() => setPage("contact")}
            className="underline hover:text-fg"
          >
            聯絡我哋
          </button>
          <span className="opacity-50">·</span>
          <button
            type="button"
            onClick={() => setPage("disclaimer")}
            className="underline hover:text-fg"
          >
            免責聲明
          </button>
        </div>
      </footer>
    </div>
  );
}
