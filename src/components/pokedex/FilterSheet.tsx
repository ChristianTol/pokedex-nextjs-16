"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useLanguage } from "@/hooks/useLanguage";

const FOCUSABLE =
  'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
};

/**
 * A panel that slides up from the bottom, for the filters on a phone. It has
 * the language button too, so the page can be translated while it is open.
 */
export function FilterSheet({ title, onClose, children, footer }: Props) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    panelRef.current?.animate(
      [{ transform: "translateY(100%)" }, { transform: "none" }],
      { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, []);

  // Lock page scroll and hand focus back to the opener afterwards.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  // The sheet is for phones; on a wider screen the bar shows everything.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const onChange = () => wide.matches && onClose();
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [onClose]);

  // Keyboard: Escape closes, Tab stays inside the sheet.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Portal: the sticky bar has a backdrop filter, which would trap `fixed`.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm md:hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <LanguageSelect round />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("detail.close")}
              className="flex size-9 items-center justify-center rounded-full bg-surface-muted text-lg leading-none hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          {children}
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
