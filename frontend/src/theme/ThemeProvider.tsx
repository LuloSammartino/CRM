import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "crm-theme";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
} | null>(null);

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window !== "undefined" ? readStoredTheme() : "light"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((x) => (x === "light" ? "dark" : "light")), []);

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
