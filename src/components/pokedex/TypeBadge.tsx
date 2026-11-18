"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { formatName } from "@/lib/pokedex/format";
import { formatMultiplier } from "@/lib/pokedex/matchups";
import { typeColor } from "@/lib/pokedex/type-colors";
import { TypeIcon } from "./TypeIcon";

type Props = {
  type: string;
  /**
   * Shows the damage multiplier as a dark segment attached to the badge, so
   * type and multiplier read as one unit. The segment is neutral on purpose:
   * the 18 type colours use every hue, so a coloured segment would blend in.
   * `multiplierClass` colours the text.
   */
  multiplier?: number;
  multiplierClass?: string;
  /** Smaller badge for narrow spots such as list cards, so two types fit side by side. On phones only the icon is shown; the name stays available to screen readers. */
  compact?: boolean;
};

export function TypeBadge({ type, multiplier, multiplierClass, compact }: Props) {
  const { tOptional } = useLanguage();
  const label = multiplier === undefined ? "" : formatMultiplier(multiplier);
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-stretch overflow-hidden rounded-md font-extrabold text-sm text-white shadow-sm`}
      // A dark tint of the type colour keeps white text readable.
      style={{
        backgroundColor: `color-mix(in srgb, ${typeColor(type)} 15%, #27272a)`,
      }}
    >
      <span
        className={`inline-flex shrink-0 items-center py-1 ${compact ? "px-1.5 sm:pr-2.5 sm:[clip-path:polygon(0_0,100%_0,calc(100%-0.75rem)_100%,0_100%)]" : "pr-3 pl-2"}`}
        style={{
          backgroundColor: typeColor(type),
          clipPath: compact
            ? undefined
            : "polygon(0 0, 100% 0, calc(100% - 0.75rem) 100%, 0 100%)",
        }}
      >
        <TypeIcon type={type} size={compact ? 28 : 24} bare />
      </span>
      <span
        className={`flex min-w-0 items-center py-1 uppercase ${compact ? "truncate pr-1.5 pl-1 max-sm:sr-only" : "px-2 tracking-wide"}`}
        style={{ textShadow: "0 2px 2px rgb(0 0 0 / 70%)" }}
      >
        {tOptional(`type.${type}`) ?? formatName(type)}
      </span>
      {label && (
        <span
          aria-hidden="true"
          className={`flex shrink-0 items-center border-l border-white/60 bg-zinc-700 px-2 py-1 font-semibold ${multiplierClass ?? ""}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
