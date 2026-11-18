import { useLanguage } from "@/hooks/useLanguage";
import type { Region, TypeFilter } from "@/lib/pokeapi/index-list";
import { hasActiveFilters, type Filters } from "@/lib/pokedex/filters";
import { formatName, formatRegion } from "@/lib/pokedex/format";
import { Select } from "@/components/Select";
import { TypeIcon } from "./TypeIcon";
import { SORT_OPTIONS, statSortOf, type SortOption } from "@/lib/pokedex/query";
import { SPECIAL_KINDS, type SpecialKind } from "@/lib/pokedex/stats-index";

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
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      {/* The controls describe themselves ("All types", "Number (low → high)"),
          so the label is only read out; this keeps the sticky bar compact. */}
      <span className="sr-only">{label}</span>
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

export function FilterBar({
  filters,
  types,
  regions,
  resultCount,
  onChange,
  onClear,
}: Props) {
  const { t, tOptional } = useLanguage();
  const sortLabel = (option: SortOption) => {
    const byStat = statSortOf(option);
    if (!byStat) return t(`sort.${option as "id-asc"}`);
    const key =
      byStat.direction === "desc" ? "sort.byStatDesc" : "sort.byStatAsc";
    return t(key).replace("{stat}", t(`stat.${byStat.stat}`));
  };
  return (
    <section className="sticky top-0 z-30 -mx-4 mb-4 flex flex-col gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_1.4fr]">
        <Field label={t("filters.search")} className="col-span-2 md:col-span-1">
          <input
            type="search"
            value={filters.search}
            placeholder={t("filters.search")}
            onChange={(event) => onChange({ search: event.target.value })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-selected"
          />
        </Field>
        <Field label={t("filters.type")}>
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
                {tOptional(`type.${type.name}`) ?? formatName(type.name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.region")}>
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
                {formatRegion(
                  tOptional(`region.${region.name}`) ?? formatName(region.name),
                  region.generation,
                )}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.special")}>
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
        <Field label={t("filters.sort")} className="col-span-2 md:col-span-1">
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
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted">
        <span aria-live="polite">
          {resultCount} {t("list.count")}
        </span>
        <div className="flex items-center gap-4">
          <FavoritesToggle
            active={filters.favorites}
            onToggle={() => onChange({ favorites: !filters.favorites })}
            className=""
          />
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
      </div>
    </section>
  );
}
