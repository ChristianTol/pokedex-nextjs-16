"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTilt } from "@/hooks/useTilt";
import { useLanguage } from "@/hooks/useLanguage";
import { pickText, type LocalizedText } from "@/lib/i18n/languages";
import type { PokemonIndexEntry } from "@/lib/pokeapi/index-list";
import { artworkUrl, formatName, formatNumber } from "@/lib/pokedex/format";
import { typeBackground } from "@/lib/pokedex/type-colors";
import { FavoriteButton } from "./FavoriteButton";
import { ShinyButton } from "./ShinyButton";
import { TypeBadge } from "./TypeBadge";

type Props = {
  entry: PokemonIndexEntry;
  /** Undefined while the types are still loading. */
  types?: string[];
  /** Species names per language, once loaded. */
  names?: LocalizedText;
  /** Show placeholders while the types / the translated name are on their way. */
  typesLoading?: boolean;
  nameLoading?: boolean;
  /** Receives the card's position, so the detail window can grow out of it. */
  onSelect: (entry: PokemonIndexEntry, rect: DOMRect) => void;
  /** True when any form of this Pokémon is a favorite. */
  favorite: boolean;
  onToggleFavorite: (entry: PokemonIndexEntry) => void;
  /** Whether the shiny version is shown. */
  shiny: boolean;
  /** Load the artwork eagerly when this card is near the top of the list. */
  eager?: boolean;
  onToggleShiny: (entry: PokemonIndexEntry) => void;
  /** The stat the list is sorted on, e.g. "Speed 90". */
  statText?: string;
};

export function PokemonCard({
  entry,
  types,
  names,
  typesLoading = false,
  nameLoading = false,
  onSelect,
  favorite,
  onToggleFavorite,
  shiny,
  eager = false,
  onToggleShiny,
  statText,
}: Props) {
  const { tiltRef, handlers } = useTilt<HTMLElement>();
  const { language, t } = useLanguage();
  const name = pickText(names, language) ?? formatName(entry.name);
  // The wrapper doesn't tilt, so its rect is the card's resting position.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [artworkLoaded, setArtworkLoaded] = useState(false);
  const background = types && typeBackground(types);

  return (
    <div ref={wrapperRef} data-pokemon-card={entry.id} {...handlers}>
      <article
        ref={tiltRef}
        className="tilt-card isolate flex aspect-[3/4] flex-col items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm"
      >
        {/* Fades in once the types are known. */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 rounded-[inherit] transition-opacity duration-500 ${
            background ? "opacity-100" : "opacity-0"
          }`}
          style={{ background }}
        />
        {/* Stretched over the whole card; keeps the card itself semantic. */}
        <button
          type="button"
          aria-label={name}
          onClick={() => {
            if (wrapperRef.current) {
              onSelect(entry, wrapperRef.current.getBoundingClientRect());
            }
          }}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selected"
        />
        <div className="flex w-full items-center justify-between">
          {/* Above the stretched button, so they receive their own clicks. */}
          <div className="relative z-20 -m-2 flex items-center">
            <FavoriteButton
              active={favorite}
              label={`${name} ${t(favorite ? "favorites.remove" : "favorites.add")}`}
              onToggle={() => onToggleFavorite(entry)}
            />
            <ShinyButton
              active={shiny}
              label={`${name} ${t(shiny ? "shiny.hide" : "shiny.show")}`}
              onToggle={() => onToggleShiny(entry)}
            />
          </div>
          <span className="text-sm font-medium text-muted">
            {formatNumber(entry.id)}
          </span>
        </div>
        <div className="relative aspect-square w-full max-w-56">
          {!artworkLoaded && (
            <div
              aria-hidden="true"
              className="skeleton absolute inset-4 rounded-full"
            />
          )}
          <Image
            src={artworkUrl(entry.id, shiny)}
            alt=""
            width={475}
            height={475}
            sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 45vw"
            loading={eager ? "eager" : "lazy"}
            onLoad={() => setArtworkLoaded(true)}
            onError={() => setArtworkLoaded(true)}
            className="relative size-full object-contain"
          />
        </div>
        <h2 className="text-center text-lg font-semibold">
          {/* While the translated name loads, readers still get a name. */}
          <span className={nameLoading ? "sr-only" : undefined}>{name}</span>
          {nameLoading && (
            <span
              aria-hidden="true"
              className="skeleton mx-auto block h-7 w-24 rounded"
            />
          )}
        </h2>
        <div className="flex min-h-6 w-full min-w-0 justify-center gap-2">
          {types?.map((type) => (
            <TypeBadge key={type} type={type} compact />
          ))}
          {typesLoading && !types && (
            <span
              aria-hidden="true"
              className="skeleton h-8 w-16 rounded-md"
            />
          )}
        </div>
        {statText && (
          <p className="text-sm font-medium tabular-nums text-muted">
            {statText}
          </p>
        )}
      </article>
    </div>
  );
}
