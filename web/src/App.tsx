import { useState, useCallback } from "react";
import { useArticles, useInit, useSearch } from "./hooks/useArticles";
import { useFavourites } from "./hooks/useFavourites";
import { useTheme } from "./hooks/useTheme";
import CategoryTabs from "./components/CategoryTabs";
import SourceFilter from "./components/SourceFilter";
import ArticleList from "./components/ArticleList";
import SearchBar from "./components/SearchBar";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import DisclaimerPage from "./components/DisclaimerPage";

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
      setIsSearching(q.length >= 2);
      search(q);
    },
    [search],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
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
    <div className="min-h-screen max-w-2xl mx-auto pb-8">
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setPage("home");
              setActiveCategory(null);
              setActiveSource(null);
              setIsSearching(false);
              setShowFavs(false);
            }}
            className="text-left"
          >
            <h1 className="text-xl font-bold text-fg tracking-tight">
              港聞講乜
            </h1>
            <p className="text-xs text-fg-muted">香港媒體 RSS 一覽 · 點擊前往原文</p>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-elevated dark:hover:bg-card-hover transition-colors"
              aria-label={isDark ? "淺色模式" : "深色模式"}
              title={isDark ? "淺色模式" : "深色模式"}
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
              aria-label="收藏"
              title="只睇收藏"
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
              aria-label="重新整理"
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
          loading={loading && !isSearching}
          error={isSearching ? null : error}
          emptyMessage={
            showFavs && !isSearching ? "暫無收藏" : undefined
          }
          isFav={isFav}
          onToggleFav={toggleFav}
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
