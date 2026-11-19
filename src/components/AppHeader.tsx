"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSelect } from "./LanguageSelect";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "nav.pokedex" },
  { href: "/team", label: "nav.team" },
  { href: "/compare", label: "nav.compare" },
  { href: "/types", label: "nav.types" },
] as const;

export function AppHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("app.title")}</h1>
        <nav aria-label={t("nav.label")}>
          <ul className="flex items-center gap-1">
            {LINKS.map(({ href, label }) => {
              const current = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-selected ${
                      current
                        ? "bg-selected text-selected-text"
                        : "text-muted hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    {t(label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      {/* On the list the phone filter bar has these buttons, so it stays sticky. */}
      <div
        className={`items-center gap-3 ${pathname === "/" ? "hidden md:flex" : "flex"}`}
      >
        <LanguageSelect />
        <ThemeToggle />
      </div>
    </header>
  );
}
