"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/hooks/useLanguage";

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

type Props = {
  stat: string;
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

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

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

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-4"
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