"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/hooks/useLanguage";

/** Plays the Pokémon's cry. */
export function CryButton({ url }: { url: string }) {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Another Pokémon (or closing the window) stops the cry.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [url]);

  function play() {
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    // Playing can be refused (e.g. a format the browser lacks); nothing to show.
    audio.play().catch(() => {});
  }

  return (
    <button
      type="button"
      onClick={play}
      className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-sm font-medium hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
        <path d="M10.5 5.5a3.5 3.5 0 010 5M12.5 3.5a6.5 6.5 0 010 9" />
      </svg>
      {t("detail.playCry")}
    </button>
  );
}
