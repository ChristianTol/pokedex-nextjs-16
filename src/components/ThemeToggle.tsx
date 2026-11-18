"use client";

import { useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle({ round = false }: { round?: boolean }) {
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  const dark = theme === "dark";

  // Follow system changes (and other tabs) when the class script hasn't run.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={t("theme.dark")}
      title={t("theme.dark")}
      className={`flex size-9 items-center justify-center border border-border text-foreground ${round ? "rounded-full bg-surface-muted" : "rounded-lg bg-surface"} transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
