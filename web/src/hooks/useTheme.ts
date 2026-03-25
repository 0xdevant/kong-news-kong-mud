import { useCallback, useEffect, useState } from "react";

const KEY = "hk_news_theme";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((d) => {
      const next = !d;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem(KEY, "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem(KEY, "light");
      }
      return next;
    });
  }, []);

  return { isDark, toggle };
}
