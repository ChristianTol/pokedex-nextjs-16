"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
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
  onRequestCloseReady: (requestClose: () => void) => void;
};

type FilterSheetAnimation = {
  finished: Promise<void>;
  cancel: () => void;
};

type FilterSheetAnimationValues = {
  panelTransform: string;
  backdropOpacity: string;
};

function combineAnimations(animations: Animation[]): FilterSheetAnimation {
  return {
    finished: Promise.all(
      animations.map((animation) => animation.finished.catch(() => undefined)),
    ).then(() => undefined),
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}

export function startFilterSheetOpenAnimation(
  panel: Pick<HTMLElement, "animate">,
  backdrop: Pick<HTMLElement, "animate">,
  prefersReducedMotion: boolean,
) {
  if (
    prefersReducedMotion ||
    typeof panel.animate !== "function" ||
    typeof backdrop.animate !== "function"
  ) {
    return [];
  }

  return [
    panel.animate(
      [{ transform: "translateY(100%)" }, { transform: "none" }],
      { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    ),
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 220,
      easing: "ease-out",
    }),
  ];
}

export function startFilterSheetCloseAnimation(
  panel: Pick<HTMLElement, "animate">,
  backdrop: Pick<HTMLElement, "animate">,
  prefersReducedMotion: boolean,
  current?: FilterSheetAnimationValues,
): FilterSheetAnimation | null {
  if (
    prefersReducedMotion ||
    typeof panel.animate !== "function" ||
    typeof backdrop.animate !== "function"
  ) {
    return null;
  }

  return combineAnimations([
    panel.animate(
      [
        { transform: current?.panelTransform ?? "translateY(0)" },
        { transform: "translateY(100%)" },
      ],
      {
        duration: 220,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      },
    ),
    backdrop.animate(
      [{ opacity: current?.backdropOpacity ?? 1 }, { opacity: 0 }],
      { duration: 220, easing: "ease-in", fill: "forwards" },
    ),
  ]);
}

export function finishFilterSheetClose(
  overlay: { style: Pick<CSSStyleDeclaration, "visibility"> } | null,
  onClose: () => void,
) {
  if (overlay) overlay.style.visibility = "hidden";
  onClose();
}

/**
 * A panel that slides up from the bottom, for the filters on a phone. It has
 * the language button too, so the page can be translated while it is open.
 */
export function FilterSheet({
  title,
  onClose,
  children,
  footer,
  onRequestCloseReady,
}: Props) {
  const { t } = useLanguage();
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isMountedRef = useRef(false);
  const isClosingRef = useRef(false);
  const closeAnimationRef = useRef<FilterSheetAnimation | null>(null);
  const openAnimationsRef = useRef<Animation[]>([]);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const panelStyle = panel ? window.getComputedStyle(panel) : null;
    const backdropStyle = backdrop ? window.getComputedStyle(backdrop) : null;

    openAnimationsRef.current.forEach((animation) => animation.cancel());
    openAnimationsRef.current = [];

    const closeAnimation =
      !isDesktop && panel && backdrop && panelStyle && backdropStyle
        ? startFilterSheetCloseAnimation(
            panel,
            backdrop,
            prefersReducedMotion,
            {
              panelTransform: panelStyle.transform,
              backdropOpacity: backdropStyle.opacity,
            },
          )
        : null;

    if (!closeAnimation) {
      isClosingRef.current = true;
      finishFilterSheetClose(overlay, onClose);
      return;
    }

    isClosingRef.current = true;
    closeAnimationRef.current = closeAnimation;
    void closeAnimation.finished.then(() => {
      if (
        !isMountedRef.current ||
        closeAnimationRef.current !== closeAnimation
      ) {
        return;
      }
      closeAnimationRef.current = null;
      finishFilterSheetClose(overlayRef.current, onClose);
    });
  }, [onClose]);

  useLayoutEffect(() => {
    onRequestCloseReady(requestClose);
    return () => onRequestCloseReady(onClose);
  }, [onClose, onRequestCloseReady, requestClose]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    openAnimationsRef.current = startFilterSheetOpenAnimation(
      panel,
      backdrop,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      closeAnimationRef.current?.cancel();
      closeAnimationRef.current = null;
      openAnimationsRef.current.forEach((animation) => animation.cancel());
      openAnimationsRef.current = [];
    };
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
    const onChange = () => wide.matches && requestClose();
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [requestClose]);

  // Keyboard: Escape closes, Tab stays inside the sheet.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
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
  }, [requestClose]);

  // Portal: the sticky bar has a backdrop filter, which would trap `fixed`.
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <LanguageSelect round />
            <button
              ref={closeRef}
              type="button"
              onClick={requestClose}
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
