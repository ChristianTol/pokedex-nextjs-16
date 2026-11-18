"use client";

import { useEffect, useState } from "react";

/**
 * Calls `onReach` whenever the returned sentinel element scrolls into view.
 * `onReach` should change identity after each load so the observer is
 * recreated and fires again if the sentinel is still visible.
 */
export function useInfiniteScroll(onReach: () => void, enabled: boolean) {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!sentinel || !enabled) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onReach();
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, enabled, onReach]);

  return setSentinel;
}
