"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/hooks/useLanguage";

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

export const TRAINING_STAT_EDITOR_BACKDROP_CLASS =
  "fixed inset-0 z-[60] flex items-end justify-center bg-black/20 md:items-center md:p-4";

export const TRAINING_STAT_EDITOR_MOBILE_QUERY = "(max-width: 767px)";

type DesktopEditorPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

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
}): DesktopEditorPosition {
  const gap = 16;
  const edge = 16;
  const leftBound = Math.max(modalLeft, edge);
  const rightBound = Math.min(modalRight, viewportWidth - edge);
  const leftSpace = Math.max(0, chartLeft - leftBound - gap);
  const rightSpace = Math.max(0, rightBound - chartRight - gap);
  const placeRight = rightSpace >= leftSpace;
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

  return { left, top, width, maxHeight };
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
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
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
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const chartScaleRef = useRef(chartScale);
  const [desktopPosition, setDesktopPosition] =
    useState<DesktopEditorPosition | null>(null);

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
      if (opener?.isConnected) opener.focus();
    };
  }, [onClose]);

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

    const visibleChart =
      chartElement.querySelector<HTMLElement>("[data-ev-radar-visual]") ??
      chartElement;

    const positionDesktopEditor = () => {
      const modalRect = modal.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const chartRect = visibleChart.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      setDesktopPosition(
        trainingDesktopEditorPosition({
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
        }),
      );
    };

    const positionChart = () => {
      cancelAnimationFrame(positionFrame);
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(editorFrame);
      positionFrame = requestAnimationFrame(() => {
        positionFrame = 0;
        const isMobile = window.matchMedia(TRAINING_STAT_EDITOR_MOBILE_QUERY).matches;

        const modalRect = modal.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const chartRect = visibleChart.getBoundingClientRect();
        const sheetTop = isMobile
          ? panel.getBoundingClientRect().top
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
        setDesktopPosition(null);

        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          const currentModalRect = modal.getBoundingClientRect();
          const currentHeaderRect = header.getBoundingClientRect();
          const currentChartRect = visibleChart.getBoundingClientRect();
          const currentSheetTop = isMobile
            ? panel.getBoundingClientRect().top
            : currentModalRect.bottom - 16;
          modal.scrollTop = trainingChartScrollTop({
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

          if (!isMobile) {
            editorFrame = requestAnimationFrame(() => {
              editorFrame = 0;
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
      setDesktopPosition(null);
      onChartScaleChange(1);
    };
  }, [chartElement, onChartScaleChange]);

  return createPortal(
    <div
      className={TRAINING_STAT_EDITOR_BACKDROP_CLASS}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-stat-editor-title"
        className="flex max-h-[85dvh] w-full flex-col overflow-y-auto rounded-t-2xl border-t border-border bg-surface shadow-2xl md:max-w-md md:rounded-2xl md:border"
        style={
          desktopPosition
            ? {
                position: "fixed",
                left: desktopPosition.left,
                top: desktopPosition.top,
                width: desktopPosition.width,
                maxWidth: "none",
                maxHeight: desktopPosition.maxHeight,
              }
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
            onClick={onClose}
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