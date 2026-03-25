import { useState, useCallback } from "react";
import { useArticles, useInit, useSearch } from "./hooks/useArticles";
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
  const [page, setPage] = useState<
    "home" | "about" | "contact" | "disclaimer"
  >("home");
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

  const displayArticles = isSearching ? searchResults : feedArticles;

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
              aria-label={isDark ? "淺色" : "深色"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-full hover:bg-elevated dark:hover:bg-card-hover disabled:opacity-50 transition-colors"
              aria-label="重新整理"
            >
              <span className={refreshing ? "inline-block animate-spin" : ""}>
                ↻
              </span>
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
