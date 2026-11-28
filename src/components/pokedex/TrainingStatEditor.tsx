"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/hooks/useLanguage";

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

export const TRAINING_STAT_EDITOR_BACKDROP_CLASS =
  "fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-4";

export const TRAINING_STAT_EDITOR_DIMMER_CLASS =
  "pointer-events-none absolute inset-0 bg-black/20";

export const TRAINING_STAT_EDITOR_MOBILE_QUERY = "(max-width: 767px)";

export function trainingStatSheetTop(backdropBottom: number, panelHeight: number) {
  return backdropBottom - panelHeight;
}

export function startTrainingStatSheetAnimation(
  panel: Pick<HTMLElement, "animate">,
  isMobile: boolean,
  prefersReducedMotion: boolean,
) {
  if (
    !isMobile ||
    prefersReducedMotion ||
    typeof panel.animate !== "function"
  ) {
    return null;
  }

  const animation = panel.animate(
    [{ transform: "translateY(100%)" }, { transform: "none" }],
    { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );

  return () => animation.cancel();
}

type TrainingEditorAnimation = {
  finished: Promise<void>;
  cancel: () => void;
};

function trainingEditorAnimation(animations: Animation[]): TrainingEditorAnimation {
  return {
    finished: Promise.all(
      animations.map((animation) => animation.finished.catch(() => undefined)),
    ).then(() => undefined),
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}

export function startTrainingStatEditorOpenAnimation(
  panel: Pick<HTMLElement, "animate">,
  prefersReducedMotion: boolean,
) {
  if (prefersReducedMotion || typeof panel.animate !== "function") {
    return null;
  }

  const animation = panel.animate(
    [
      { opacity: 0, transform: "scale(0.96)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
  return () => animation.cancel();
}

export function startTrainingStatBackdropOpenAnimation(
  backdrop: Pick<HTMLElement, "animate">,
  prefersReducedMotion: boolean,
) {
  if (prefersReducedMotion || typeof backdrop.animate !== "function") return null;

  const animation = backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 220,
    easing: "ease-out",
  });
  return () => animation.cancel();
}

export function startTrainingStatEditorCloseAnimation(
  panel: Pick<HTMLElement, "animate">,
  backdrop: Pick<HTMLElement, "animate">,
  isMobile: boolean,
  prefersReducedMotion: boolean,
  current?: {
    panelOpacity: string;
    panelTransform: string;
    backdropOpacity: string;
  },
): TrainingEditorAnimation | null {
  if (
    prefersReducedMotion ||
    typeof panel.animate !== "function" ||
    typeof backdrop.animate !== "function"
  ) {
    return null;
  }

  const animations = isMobile
    ? [
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
        backdrop.animate([{ opacity: current?.backdropOpacity ?? 1 }, { opacity: 0 }], {
          duration: 220,
          easing: "ease-in",
          fill: "forwards",
        }),
      ]
    : [
        panel.animate(
          [
            {
              opacity: current?.panelOpacity ?? 1,
              transform: current?.panelTransform ?? "scale(1)",
            },
            { opacity: 0, transform: "scale(0.96)" },
          ],
          { duration: 160, easing: "ease-in", fill: "forwards" },
        ),
        backdrop.animate([{ opacity: current?.backdropOpacity ?? 1 }, { opacity: 0 }], {
          duration: 160,
          easing: "ease-in",
          fill: "forwards",
        }),
      ];

  return trainingEditorAnimation(animations);
}

export function finishTrainingStatEditorClose(
  backdrop: { style: Pick<CSSStyleDeclaration, "visibility"> } | null,
  onClose: () => void,
) {
  if (backdrop) backdrop.style.visibility = "hidden";
  onClose();
}

export function scrollTrainingModalTo(
  modal: Pick<HTMLElement, "scrollTop" | "scrollTo">,
  scrollTop: number,
  smooth: boolean,
) {
  if (smooth) {
    modal.scrollTo({ top: scrollTop, behavior: "smooth" });
  } else {
    modal.scrollTop = scrollTop;
  }
}

export function cancelTrainingModalScroll(
  modal: Pick<HTMLElement, "scrollTop">,
) {
  modal.scrollTop = modal.scrollTop;
}

export function trainingRangeValueAtPointer(
  clientX: number,
  bounds: Pick<DOMRect, "left" | "width">,
  min: number,
  max: number,
) {
  const inset = Math.min(8, bounds.width / 2);
  const travelWidth = Math.max(1, bounds.width - inset * 2);
  const position = Math.min(
    1,
    Math.max(0, (clientX - bounds.left - inset) / travelWidth),
  );

  return Math.round(min + position * Math.max(0, max - min));
}

type TrainingRangeInputProps = {
  id?: string;
  min: number;
  max: number;
  value: number;
  ariaLabel: string;
  className?: string;
  style?: CSSProperties;
  onChange: (value: number) => void;
};

export function TrainingRangeInput({
  id,
  min,
  max,
  value,
  ariaLabel,
  className = "",
  style,
  onChange,
}: TrainingRangeInputProps) {
  const updateFromPointer = (event: PointerEvent<HTMLInputElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    onChange(trainingRangeValueAtPointer(event.clientX, bounds, min, max));
  };

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      onPointerDown={(event) => {
        if (
          !event.isPrimary ||
          (event.pointerType === "mouse" && event.button !== 0)
        ) {
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          updateFromPointer(event);
        }
      }}
      style={style}
      className={`${className} touch-none`.trim()}
    />
  );
}

type DesktopEditorPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "left" | "right";
};

type DesktopEditorPlacement = DesktopEditorPosition["placement"];

type TrainingChartLayoutInput = {
  modalTop: number;
  modalBottom: number;
  headerBottom: number;
  sheetTop: number;
  chartTop: number;
  chartHeight: number;
  chartScale: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

type TrainingChartScrollInput = Omit<TrainingChartLayoutInput, "chartScale">;

export function trainingChartScrollTop({
  modalTop,
  modalBottom,
  headerBottom,
  sheetTop,
  chartTop,
  chartHeight,
  scrollTop,
  scrollHeight,
  clientHeight,
}: TrainingChartScrollInput) {
  const visibleTop = Math.max(modalTop, headerBottom);
  const visibleBottom = Math.min(modalBottom, sheetTop);
  const visibleCenter = (visibleTop + visibleBottom) / 2;
  const chartCenter = chartTop + chartHeight / 2;
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight);

  return Math.min(
    maxScrollTop,
    Math.max(0, scrollTop + chartCenter - visibleCenter),
  );
}

export function trainingChartLayout({
  chartHeight,
  chartScale,
  ...input
}: TrainingChartLayoutInput) {
  const visibleTop = Math.max(input.modalTop, input.headerBottom);
  const visibleBottom = Math.min(input.modalBottom, input.sheetTop);
  const availableHeight = Math.max(0, visibleBottom - visibleTop - 24);
  const unscaledChartHeight = chartHeight / Math.max(chartScale, 0.01);
  const scale =
    availableHeight > 0 && unscaledChartHeight > 0
      ? Math.min(1, Math.max(0.4, availableHeight / unscaledChartHeight))
      : 1;

  return {
    scale,
    scrollTop: trainingChartScrollTop({
      ...input,
      chartHeight: unscaledChartHeight * scale,
    }),
  };
}

export function trainingDesktopEditorPosition({
  modalLeft,
  modalRight,
  visibleTop,
  visibleBottom,
  chartLeft,
  chartRight,
  chartTop,
  chartHeight,
  panelWidth,
  panelHeight,
  viewportWidth,
  placement,
}: {
  modalLeft: number;
  modalRight: number;
  visibleTop: number;
  visibleBottom: number;
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartHeight: number;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  placement?: DesktopEditorPlacement;
}): DesktopEditorPosition {
  const gap = 16;
  const edge = 16;
  const leftBound = Math.max(modalLeft, edge);
  const rightBound = Math.min(modalRight, viewportWidth - edge);
  const leftSpace = Math.max(0, chartLeft - leftBound - gap);
  const rightSpace = Math.max(0, rightBound - chartRight - gap);
  const placeRight = placement ? placement === "right" : rightSpace >= leftSpace;
  const availableSpace = placeRight ? rightSpace : leftSpace;
  const width = Math.min(panelWidth, Math.max(1, availableSpace));
  const minLeft = leftBound;
  const maxLeft = Math.max(minLeft, rightBound - width);
  const left = Math.min(
    maxLeft,
    Math.max(minLeft, placeRight ? chartRight + gap : chartLeft - gap - width),
  );
  const maxHeight = Math.max(160, visibleBottom - visibleTop - 24);
  const height = Math.min(panelHeight, maxHeight);
  const top = Math.min(
    visibleBottom - height - 12,
    Math.max(visibleTop + 12, chartTop + chartHeight / 2 - height / 2),
  );

  return {
    left,
    top,
    width,
    maxHeight,
    placement: placeRight ? "right" : "left",
  };
}

type Props = {
  stat: string;
  chartElement: HTMLElement | null;
  chartScale: number;
  onChartScaleChange: (scale: number) => void;
  statLabel: string;
  statColor: string;
  accentColor: string;
  iv: number;
  ev: number;
  maxEv: number;
  remainingEvs: number;
  onChangeIv: (value: number) => void;
  onChangeEv: (value: number) => void;
  onReset: () => void;
  onClose: () => void;
};

function StatSlider({
  id,
  label,
  value,
  max,
  accentColor,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  accentColor: string;
  onChange: (value: number) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3 text-sm font-medium">
        {label}
        <output htmlFor={id} className="tabular-nums text-muted">
          {value}
        </output>
      </span>
      <TrainingRangeInput
        id={id}
        min={0}
        max={max}
        value={value}
        ariaLabel={label}
        onChange={onChange}
        style={{ accentColor }}
        className="w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
    </label>
  );
}

export function TrainingStatEditor({
  stat,
  chartElement,
  chartScale,
  onChartScaleChange,
  statLabel,
  statColor,
  accentColor,
  iv,
  ev,
  maxEv,
  remainingEvs,
  onChangeIv,
  onChangeEv,
  onReset,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const chartScaleRef = useRef(chartScale);
  const isMountedRef = useRef(false);
  const isClosingRef = useRef(false);
  const closeAnimationRef = useRef<TrainingEditorAnimation | null>(null);
  const hasStartedDesktopOpeningAnimationRef = useRef(false);
  const [desktopPosition, setDesktopPosition] =
    useState<DesktopEditorPosition | null>(null);
  const hasDesktopEditorPlacement = desktopPosition !== null;
  const isMobileViewport =
    typeof window !== "undefined" &&
    window.matchMedia(TRAINING_STAT_EDITOR_MOBILE_QUERY).matches;

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    const modal = document.querySelector<HTMLElement>(
      "[data-training-modal-scroll]",
    );
    if (modal) cancelTrainingModalScroll(modal);

    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const panelStyle = panel ? window.getComputedStyle(panel) : null;
    const backdropStyle = backdrop ? window.getComputedStyle(backdrop) : null;
    const closeAnimation =
      panel && backdrop && panelStyle && backdropStyle
        ? startTrainingStatEditorCloseAnimation(
            panel,
            backdrop,
            window.matchMedia(TRAINING_STAT_EDITOR_MOBILE_QUERY).matches,
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            {
              panelOpacity: panelStyle.opacity,
              panelTransform: panelStyle.transform,
              backdropOpacity: backdropStyle.opacity,
            },
          )
        : null;

    if (!closeAnimation) {
      onClose();
      return;
    }

    isClosingRef.current = true;
    closeAnimationRef.current = closeAnimation;
    void closeAnimation.finished.then(() => {
      if (!isMountedRef.current || closeAnimationRef.current !== closeAnimation) {
        return;
      }
      closeAnimationRef.current = null;
      finishTrainingStatEditorClose(overlayRef.current, onClose);
    });
  }, [onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      closeAnimationRef.current?.cancel();
      closeAnimationRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartScaleRef.current = chartScale;
  }, [chartScale]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
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
        event.stopPropagation();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        event.stopPropagation();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [requestClose]);

  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;

    const cancelAnimation = startTrainingStatBackdropOpenAnimation(
      backdrop,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    return () => cancelAnimation?.();
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const cancelAnimation = startTrainingStatSheetAnimation(
      panel,
      window.matchMedia(TRAINING_STAT_EDITOR_MOBILE_QUERY).matches,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );

    return () => cancelAnimation?.();
  }, []);

  useLayoutEffect(() => {
    if (
      !hasDesktopEditorPlacement ||
      isClosingRef.current ||
      window.matchMedia(TRAINING_STAT_EDITOR_MOBILE_QUERY).matches ||
      hasStartedDesktopOpeningAnimationRef.current
    ) {
      return;
    }

    hasStartedDesktopOpeningAnimationRef.current = true;
    const panel = panelRef.current;
    if (!panel) return;

    const cancelAnimation = startTrainingStatEditorOpenAnimation(
      panel,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );

    return () => cancelAnimation?.();
  }, [hasDesktopEditorPlacement]);

  useLayoutEffect(() => {
    const modal = document.querySelector<HTMLElement>(
      "[data-training-modal-scroll]",
    );
    const header = modal?.querySelector<HTMLElement>(
      "[data-training-modal-header]",
    );
    const panel = panelRef.current;
    if (!chartElement || !modal || !header || !panel) return;

    let positionFrame = 0;
    let scrollFrame = 0;
    let editorFrame = 0;
    let shouldAnimateInitialScroll = true;
    let hasSmoothScroll = false;
    let desktopPlacement: DesktopEditorPlacement | undefined;

    const visibleChart =
      chartElement.querySelector<HTMLElement>("[data-ev-radar-visual]") ??
      chartElement;

    const positionDesktopEditor = () => {
      if (isClosingRef.current) return;
      const modalRect = modal.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const chartRect = visibleChart.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const position = trainingDesktopEditorPosition({
        modalLeft: modalRect.left,
        modalRight: modalRect.right,
        visibleTop: Math.max(modalRect.top, headerRect.bottom),
        visibleBottom: modalRect.bottom,
        chartLeft: chartRect.left,
        chartRight: chartRect.right,
        chartTop: chartRect.top,
        chartHeight: chartRect.height,
        panelWidth: panelRect.width,
        panelHeight: panelRect.height,
        viewportWidth: window.innerWidth,
        placement: desktopPlacement,
      });
      desktopPlacement = position.placement;
      setDesktopPosition(position);
    };

    const positionChart = () => {
      if (isClosingRef.current) return;
      cancelAnimationFrame(positionFrame);
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(editorFrame);
      positionFrame = requestAnimationFrame(() => {
        positionFrame = 0;
        if (isClosingRef.current) return;
        const isMobile = window.matchMedia(TRAINING_STAT_EDITOR_MOBILE_QUERY).matches;
        if (isMobile) {
          setDesktopPosition(null);
        }

        const modalRect = modal.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const chartRect = visibleChart.getBoundingClientRect();
        const backdropRect = panel.parentElement?.getBoundingClientRect();
        const sheetTop = isMobile
          ? trainingStatSheetTop(
              backdropRect?.bottom ?? modalRect.bottom,
              panel.offsetHeight,
            )
          : modalRect.bottom - 16;
        const layout = trainingChartLayout({
          modalTop: modalRect.top,
          modalBottom: modalRect.bottom,
          headerBottom: headerRect.bottom,
          sheetTop,
          chartTop: chartRect.top,
          chartHeight: chartRect.height,
          chartScale: chartScaleRef.current,
          scrollTop: modal.scrollTop,
          scrollHeight: modal.scrollHeight,
          clientHeight: modal.clientHeight,
        });
        onChartScaleChange(layout.scale);

        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          if (isClosingRef.current) return;
          const currentModalRect = modal.getBoundingClientRect();
          const currentHeaderRect = header.getBoundingClientRect();
          const currentChartRect = visibleChart.getBoundingClientRect();
          const currentBackdropRect = panel.parentElement?.getBoundingClientRect();
          const currentSheetTop = isMobile
            ? trainingStatSheetTop(
                currentBackdropRect?.bottom ?? currentModalRect.bottom,
                panel.offsetHeight,
              )
            : currentModalRect.bottom - 16;
          const nextScrollTop = trainingChartScrollTop({
            modalTop: currentModalRect.top,
            modalBottom: currentModalRect.bottom,
            headerBottom: currentHeaderRect.bottom,
            sheetTop: currentSheetTop,
            chartTop: currentChartRect.top,
            chartHeight: currentChartRect.height,
            scrollTop: modal.scrollTop,
            scrollHeight: modal.scrollHeight,
            clientHeight: modal.clientHeight,
          });
          const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          const smoothInitialScroll =
            shouldAnimateInitialScroll && !prefersReducedMotion;
          scrollTrainingModalTo(modal, nextScrollTop, smoothInitialScroll);
          shouldAnimateInitialScroll = false;
          if (smoothInitialScroll) hasSmoothScroll = true;

          if (!isMobile) {
            editorFrame = requestAnimationFrame(() => {
              editorFrame = 0;
              if (isClosingRef.current) return;
              positionDesktopEditor();
            });
          }
        });
      });
    };

    const updateDesktopEditorPosition = () => {
      if (!window.matchMedia(TRAINING_STAT_EDITOR_MOBILE_QUERY).matches) {
        positionDesktopEditor();
      }
    };

    positionChart();
    window.addEventListener("resize", positionChart);
    window.visualViewport?.addEventListener("resize", positionChart);
    modal.addEventListener("scroll", updateDesktopEditorPosition);

    return () => {
      cancelAnimationFrame(positionFrame);
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(editorFrame);
      window.removeEventListener("resize", positionChart);
      window.visualViewport?.removeEventListener("resize", positionChart);
      modal.removeEventListener("scroll", updateDesktopEditorPosition);
      if (hasSmoothScroll) cancelTrainingModalScroll(modal);
      setDesktopPosition(null);
      onChartScaleChange(1);
    };
  }, [chartElement, onChartScaleChange]);

  return createPortal(
    <div
      ref={overlayRef}
      className={TRAINING_STAT_EDITOR_BACKDROP_CLASS}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={backdropRef}
        aria-hidden="true"
        className={TRAINING_STAT_EDITOR_DIMMER_CLASS}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-stat-editor-title"
        className="relative flex max-h-[85dvh] w-full flex-col overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-2xl md:max-w-md md:rounded-2xl md:border"
        style={
          !isMobileViewport && desktopPosition
            ? {
                position: "fixed",
                left: desktopPosition.left,
                top: desktopPosition.top,
                width: desktopPosition.width,
                maxWidth: "none",
                maxHeight: desktopPosition.maxHeight,
              }
            : !isMobileViewport && !desktopPosition
              ? { opacity: 0, pointerEvents: "none" }
              : undefined
        }
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
          <h2
            id="training-stat-editor-title"
            className="flex min-w-0 items-center gap-2 text-lg font-semibold"
          >
            <span
              aria-hidden="true"
              className={`size-3 shrink-0 rounded-full ${statColor}`}
            />
            <span className="truncate">
              {t("detail.adjustStat").replace("{stat}", statLabel)}
            </span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            aria-label={t("detail.close")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg leading-none hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-5 p-4">
          <StatSlider
            id={`training-iv-${stat}`}
            label={t("detail.ivs")}
            value={iv}
            max={31}
            accentColor={accentColor}
            onChange={onChangeIv}
          />
          <StatSlider
            id={`training-ev-${stat}`}
            label={t("detail.evs")}
            value={ev}
            max={maxEv}
            accentColor={accentColor}
            onChange={onChangeEv}
          />
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
            <span>{t("detail.evLimits")}</span>
            <span aria-live="polite">
              {t("detail.remainingEvs").replace(
                "{count}",
                String(remainingEvs),
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="self-start rounded-lg border border-border/50 bg-surface-muted px-3 py-2 text-sm font-medium hover:bg-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t("detail.resetTraining")}
          </button>
        </div>
        <div className="border-t border-border/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden" />
      </div>
    </div>,
    document.body,
  );
}