import { useCallback, useRef, useState } from "react";
import { LanguageSelect } from "@/components/LanguageSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/hooks/useLanguage";
import type { Region, TypeFilter } from "@/lib/pokeapi/index-list";
import { hasActiveFilters, type Filters } from "@/lib/pokedex/filters";
import { formatName, formatRegion } from "@/lib/pokedex/format";
import { Select } from "@/components/Select";
import { FilterSheet } from "./FilterSheet";
import { TypeIcon } from "./TypeIcon";
import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  statSortOf,
  type SortOption,
} from "@/lib/pokedex/query";
import {
  FORMS_FILTERS,
  SPECIAL_KINDS,
  type FormsFilter,
  type SpecialKind,
} from "@/lib/pokedex/stats-index";

type Props = {
  filters: Filters;
  types: TypeFilter[];
  regions: Region[];
  resultCount: number;
  onChange: (next: Partial<Filters>) => void;
  onClear: () => void;
};

function Field({
  label,
  className,
  visible = false,
  children,
}: {
  label: string;
  className?: string;
  /** Show the label (in the sheet); in the bar the controls describe themselves. */
  visible?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      {/* In the sticky bar the controls describe themselves ("All types",
          "Number (low → high)"), so the label is only read out. */}
      <span className={visible ? "mb-1 block text-sm font-medium" : "sr-only"}>
        {label}
      </span>
      {children}
    </label>
  );
}

function FavoritesToggle({
  active,
  onToggle,
  className,
}: {
  active: boolean;
  onToggle: () => void;
  className: string;
}) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-selected ${
        active
          ? "border-selected bg-selected text-selected-text"
          : "border-border bg-surface hover:bg-surface-muted"
      } ${className}`}
    >
      ♥ {t("filters.favorites")}
    </button>
  );
}

export function SearchField({
  search,
  label,
  clearLabel,
  onChange,
}: {
  search: string;
  label: string;
  clearLabel: string;
  onChange: (next: Partial<Filters>) => void;
}) {
  return (
    <div className="relative">
      <input
        type="search"
        inputMode="search"
        value={search}
        placeholder={label}
        aria-label={label}
        onChange={(event) => onChange({ search: event.target.value })}
        className="filter-search w-full rounded-lg border border-border bg-surface px-3 py-1.5 pr-10 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-selected md:pr-3 md:text-sm"
      />
      {search !== "" && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onChange({ search: "" })}
          className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-selected md:hidden"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

function FilterIcon() {
  return (
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
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

export function FilterBar({
  filters,
  types,
  regions,
  resultCount,
  onChange,
  onClear,
}: Props) {
  const { t, tOptional } = useLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const sheetCloseRequestRef = useRef(closeSheet);
  const requestSheetClose = useCallback(
    () => sheetCloseRequestRef.current(),
    [],
  );
  const registerSheetCloseRequest = useCallback(
    (requestClose: () => void) => {
      sheetCloseRequestRef.current = requestClose;
    },
    [],
  );
  const sortLabel = (option: SortOption) => {
    const byStat = statSortOf(option);
    if (!byStat) return t(`sort.${option as "id-asc"}`);
    const key =
      byStat.direction === "desc" ? "sort.byStatDesc" : "sort.byStatAsc";
    return t(key).replace("{stat}", t(`stat.${byStat.stat}`));
  };
  const typeLabel = (name: string) =>
    tOptional(`type.${name}`) ?? formatName(name);
  const regionLabel = (region: Region) =>
    formatRegion(
      tOptional(`region.${region.name}`) ?? formatName(region.name),
      region.generation,
    );

  const search = (
    <SearchField
      search={filters.search}
      label={t("filters.search")}
      clearLabel={t("filters.clearSearch")}
      onChange={onChange}
    />
  );

  // The five dropdowns, for the bar (md and up) and for the sheet (phones).
  const dropdowns = (inSheet: boolean) => {
    const span = inSheet ? undefined : "col-span-2 md:col-span-1";
    return (
      <>
        <Field label={t("filters.type")} visible={inSheet}>
          {/* A native dropdown can't show images in its options, so the
              chosen type's icon is shown in the field itself. */}
          <Select
            className="w-full"
            icon={
              filters.type ? <TypeIcon type={filters.type} size={20} /> : null
            }
            value={filters.type ?? ""}
            onChange={(event) => onChange({ type: event.target.value || null })}
          >
            <option value="">{t("filters.allTypes")}</option>
            {types.map((type) => (
              <option key={type.name} value={type.name}>
                {typeLabel(type.name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.region")} visible={inSheet}>
          <Select
            className="w-full"
            value={filters.region ?? ""}
            onChange={(event) =>
              onChange({ region: event.target.value || null })
            }
          >
            <option value="">{t("filters.allRegions")}</option>
            {regions.map((region) => (
              <option key={region.name} value={region.name}>
                {regionLabel(region)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.special")} visible={inSheet}>
          <Select
            className="w-full"
            value={filters.special ?? ""}
            onChange={(event) =>
              onChange({
                special: (event.target.value || null) as SpecialKind | null,
              })
            }
          >
            <option value="">{t("filters.allSpecial")}</option>
            {SPECIAL_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`special.${kind}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.forms")} visible={inSheet}>
          <Select
            className="w-full"
            value={filters.forms ?? ""}
            onChange={(event) =>
              onChange({
                forms: (event.target.value || null) as FormsFilter | null,
              })
            }
          >
            <option value="">{t("filters.allForms")}</option>
            {FORMS_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {t(`forms.${filter}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.sort")} className={span} visible={inSheet}>
          <Select
            className="w-full"
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value as SortOption })
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {sortLabel(option)}
              </option>
            ))}
          </Select>
        </Field>
      </>
    );
  };

  // What is switched on, shown as chips on a phone so it can be removed
  // without opening the sheet. The search text is already visible in its field.
  const chips: {
    key: string;
    /** Plain text, for the accessible name. */
    text: string;
    label: React.ReactNode;
    remove: () => void;
  }[] = [];
  if (filters.type) {
    const type = filters.type;
    chips.push({
      key: "type",
      text: typeLabel(type),
      label: (
        <>
          <TypeIcon type={type} size={16} />
          {typeLabel(type)}
        </>
      ),
      remove: () => onChange({ type: null }),
    });
  }
  const region = regions.find((item) => item.name === filters.region);
  if (region) {
    chips.push({
      key: "region",
      text: regionLabel(region),
      label: regionLabel(region),
      remove: () => onChange({ region: null }),
    });
  }
  if (filters.special) {
    chips.push({
      key: "special",
      text: t(`special.${filters.special}`),
      label: t(`special.${filters.special}`),
      remove: () => onChange({ special: null }),
    });
  }
  if (filters.forms) {
    chips.push({
      key: "forms",
      text: t(`forms.${filters.forms}`),
      label: t(`forms.${filters.forms}`),
      remove: () => onChange({ forms: null }),
    });
  }
  if (filters.favorites) {
    chips.push({
      key: "favorites",
      text: t("filters.favorites"),
      label: `♥ ${t("filters.favorites")}`,
      remove: () => onChange({ favorites: false }),
    });
  }
  if (filters.sort !== DEFAULT_SORT) {
    chips.push({
      key: "sort",
      text: sortLabel(filters.sort),
      label: sortLabel(filters.sort),
      remove: () => onChange({ sort: DEFAULT_SORT }),
    });
  }

  return (
    <section className="sticky top-0 z-30 -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      {/* Phones: search and a few round buttons; the rest is in the sheet. */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{search}</div>
          <button
            type="button"
            aria-pressed={filters.favorites}
            aria-label={t("filters.favorites")}
            onClick={() => onChange({ favorites: !filters.favorites })}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-selected ${
              filters.favorites
                ? "border-selected bg-selected text-selected-text"
                : "border-border bg-surface-muted"
            }`}
          >
            <span aria-hidden="true">♥</span>
          </button>
          <LanguageSelect round />
          <ThemeToggle round />
          <button
            type="button"
            aria-label={`${t("filters.title")}${chips.length > 0 ? ` (${chips.length})` : ""}`}
            aria-haspopup="dialog"
            onClick={() => setSheetOpen(true)}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
          >
            <FilterIcon />
            {chips.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -bottom-1 flex min-w-4 items-center justify-center rounded-full bg-selected px-1 text-[10px] leading-4 font-bold text-selected-text"
              >
                {chips.length}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span aria-live="polite" className="shrink-0">
            {resultCount} {t("list.count")}
          </span>
          {chips.length > 0 && (
            <ul className="flex min-w-0 items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {chips.map((chip) => (
                <li key={chip.key} className="shrink-0">
                  <button
                    type="button"
                    onClick={chip.remove}
                    aria-label={`${t("filters.remove")}: ${chip.text}`}
                    className="inline-flex items-center gap-1 rounded-full border border-selected bg-selected px-2.5 py-0.5 text-xs font-medium text-selected-text focus-visible:outline-2 focus-visible:outline-selected"
                  >
                    {chip.label}
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Wider screens: everything in the bar. */}
      <div className="hidden flex-col gap-2 md:flex">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.4fr] gap-2">
          <div>{search}</div>
          {dropdowns(false)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted">
          <div className="flex items-center gap-4">
            <span aria-live="polite">
              {resultCount} {t("list.count")}
            </span>
            {hasActiveFilters(filters) && (
              <button
                type="button"
                onClick={onClear}
                className="font-medium text-accent hover:underline"
              >
                {t("filters.clear")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelect compact />
            <FavoritesToggle
              active={filters.favorites}
              onToggle={() => onChange({ favorites: !filters.favorites })}
              className=""
            />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {sheetOpen && (
        <FilterSheet
          title={t("filters.title")}
          onClose={closeSheet}
          onRequestCloseReady={registerSheetCloseRequest}
          footer={
            <>
              <button
                type="button"
                onClick={requestSheetClose}
                className="rounded-lg border border-selected bg-selected px-4 py-2.5 text-sm font-medium text-selected-text focus-visible:outline-2 focus-visible:outline-selected"
              >
                {t("filters.showResults").replace(
                  "{count}",
                  String(resultCount),
                )}
              </button>
              {hasActiveFilters(filters) && (
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-selected"
                >
                  {t("filters.clear")}
                </button>
              )}
            </>
          }
        >
          {dropdowns(true)}
          <FavoritesToggle
            active={filters.favorites}
            onToggle={() => onChange({ favorites: !filters.favorites })}
            className="py-2.5"
          />
        </FilterSheet>
      )}
    </section>
  );
}
