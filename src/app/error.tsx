"use client";

import { useLanguage } from "@/hooks/useLanguage";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{t("error.title")}</h1>
      <p className="text-muted">{t("error.description")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent-solid px-4 py-2 font-medium text-white"
      >
        {t("common.retry")}
      </button>
    </main>
  );
}
