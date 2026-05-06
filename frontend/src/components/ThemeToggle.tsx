import { useTheme } from "../theme/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-violet-500/50 dark:hover:bg-slate-800"
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDark}
    >
      <span className="text-base leading-none" aria-hidden>
        {isDark ? "☀️" : "🌙"}
      </span>
      <span className="hidden sm:inline">{isDark ? "Modo claro" : "Modo oscuro"}</span>
    </button>
  );
}
