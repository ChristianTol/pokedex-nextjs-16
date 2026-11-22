import { useLanguage } from "@/hooks/useLanguage";
import { CARD } from "./PokemonDetails";

/*
 * Placeholders for the detail window while a Pokémon loads. They follow the
 * layout of the real blocks (same grids, titles and roughly the same heights)
 * so nothing moves when the data arrives.
 */

function Bar({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />
  );
}

function SectionSkeleton({
  title,
  tallHeader = false,
  className,
  children,
}: {
  title: string;
  /** Matches a section whose header holds a button, so nothing jumps. */
  tallHeader?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-3 ${CARD}${className ? ` ${className}` : ""}`}
    >
      <h3
        className={`text-sm font-semibold text-muted ${tallHeader ? "sm:flex sm:min-h-7.5 sm:items-center" : ""}`}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Gender and size, beside the description (or below the forms on a phone). */
export function FactsSkeleton() {
  const { t } = useLanguage();
  return (
    <div aria-hidden="true" className="grid gap-3 lg:grid-cols-2">
      <SectionSkeleton title={t("detail.gender")}>
        <Bar className="h-7 w-full" />
      </SectionSkeleton>
      <SectionSkeleton title={`${t("detail.height")} / ${t("detail.weight")}`}>
        <Bar className="h-7 w-full" />
      </SectionSkeleton>
    </div>
  );
}

/** The kind of Pokémon and its types, under the name. */
export function TitleSkeleton() {
  return (
    <>
      <Bar className="h-5 w-32" />
      <div aria-hidden="true" className="flex h-6 gap-1.5">
        <div className="skeleton w-16 rounded-full" />
        <div className="skeleton w-16 rounded-full" />
      </div>
    </>
  );
}

/** The button that plays the cry, the same size as the real one. */
export function CrySkeleton() {
  return (
    <div className="flex justify-center sm:justify-end">
      <div aria-hidden="true" className="skeleton h-7 w-28 rounded-full" />
    </div>
  );
}

/** The forms, beside the title while their data is loading. */
export function FormPickerSkeleton() {
  const { t } = useLanguage();
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-3">
      <h3 className="text-sm font-semibold text-muted">{t("detail.forms")}</h3>
      <ul className="flex min-w-0 max-w-full gap-2 overflow-hidden sm:max-w-[21.5rem]">
        {Array.from({ length: 4 }, (_, index) => (
          <li
            key={index}
            className="flex w-20 shrink-0 flex-col items-center gap-1.5"
          >
            <div className="skeleton size-20 rounded-lg" />
            <Bar className="h-4 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The description, desktop facts, and mobile forms and facts. */
export function IntroSkeleton() {
  return (
    <>
      <div className={`sm:hidden ${CARD}`}>
        <FormPickerSkeleton />
      </div>
      <div aria-hidden="true" className={`${CARD} flex flex-col gap-2`}>
        <Bar className="h-5 w-full" />
        <Bar className="h-5 w-full" />
        <Bar className="h-5 w-2/3" />
      </div>
      <div className="hidden min-w-0 sm:block lg:self-center">
        <FactsSkeleton />
      </div>
      <div className="sm:hidden">
        <FactsSkeleton />
      </div>
    </>
  );
}

/** Stats, evolution, abilities, matchups, training advice and moves. */
export function DetailsSkeleton() {
  const { t } = useLanguage();
  return (
    <div role="status" className="flex flex-col gap-6 lg:gap-8">
      <span className="sr-only">{t("detail.loading")}</span>
      <div
        aria-hidden="true"
        className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8"
      >
        <SectionSkeleton title={t("detail.stats")} className="lg:self-center">
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <li
                key={index}
                className="grid grid-cols-[8.5rem_2.5rem_1fr] items-center gap-2"
              >
                <Bar className="h-5 w-24" />
                <Bar className="h-5 w-8" />
                <Bar className="h-2 w-full rounded-full" />
              </li>
            ))}
          </ul>
        </SectionSkeleton>
        <SectionSkeleton title={t("detail.evolution")} tallHeader>
          <Bar className="h-32 w-full" />
        </SectionSkeleton>
      </div>
      <div aria-hidden="true" className="contents">
        <SectionSkeleton title={t("detail.abilities")}>
          <div className="grid gap-3 lg:grid-cols-3">
            <Bar className="h-16 w-full" />
            <Bar className="h-16 w-full" />
            <Bar className="h-16 w-full" />
          </div>
        </SectionSkeleton>
        <SectionSkeleton title={t("detail.matchups")}>
          <Bar className="h-24 w-full" />
        </SectionSkeleton>
        <SectionSkeleton title={t("detail.trainingAdvice")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Bar className="h-44 w-full" />
            <Bar className="h-44 w-full" />
          </div>
          <Bar className="h-4 w-3/4" />
          <Bar className="h-4 w-36" />
        </SectionSkeleton>
        <SectionSkeleton title={t("detail.moves")}>
          <Bar className="h-48 w-full" />
        </SectionSkeleton>
      </div>
    </div>
  );
}
