"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { IconSelect } from "@/components/IconSelect";
import { LanguageSelect } from "@/components/LanguageSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select } from "@/components/Select";
import { useFavorites } from "@/hooks/useFavorites";
import { useLanguage } from "@/hooks/useLanguage";
import { usePokemonDetail } from "@/hooks/usePokemonDetail";
import { usePokemonFormSprites } from "@/hooks/usePokemonFormSprites";
import { usePokemonMoves } from "@/hooks/usePokemonMoves";
import { pickText, type LocalizedText } from "@/lib/i18n/languages";
import type { PokemonIndexEntry } from "@/lib/pokeapi/index-list";
import { makeFavoriteKey } from "@/lib/pokedex/favorites";
import { artworkUrl, formatName, formatNumber } from "@/lib/pokedex/format";
import {
  descriptionForGame,
  detailForGame,
  hasSpriteToggle,
  spriteForGameOrLatest,
} from "@/lib/pokedex/game-detail";
import { formatGame, gameGeneration } from "@/lib/pokedex/games";
import { typeBackground } from "@/lib/pokedex/type-colors";
import { CryButton } from "./CryButton";
import { FavoriteButton } from "./FavoriteButton";
import { FormPicker } from "./FormPicker";
import { CARD, PokemonDetails, PokemonFacts } from "./PokemonDetails";
import {
  CrySkeleton,
  DetailsSkeleton,
  FormPickerSkeleton,
  IntroSkeleton,
  TitleSkeleton,
} from "./PokemonSkeleton";
import { TypeBadge } from "./TypeBadge";

/** The Pokémon before or after this one in the list. */
export type Neighbor = { id: number; name: string };

type Props = {
  entry: PokemonIndexEntry;
  /** Where the clicked card was; the window grows out of (and back into) it. */
  originRect: DOMRect | null;
  /** Called after the closing animation. */
  onClose: () => void;
  /** Switch the window to another Pokémon, e.g. from the evolution chain. */
  onSelectPokemon: (id: number) => void;
  previous: Neighbor | null;
  next: Neighbor | null;
  /** The types from the list, so the window is tinted before its data is in. */
  initialTypes?: string[];
  /** The names from the list, so the title is in your language at once. */
  initialNames?: LocalizedText;
  /** Species that are shown in their shiny colours. */
  shinyIds: ReadonlySet<number>;
  onToggleShiny: () => void;
  /** Turns shiny on or off for several species at once. */
  onSetShiny: (ids: readonly number[], on: boolean) => void;
};

const OPEN_MS = 340;
const CLOSE_MS = 240;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** How far (px) a finger must move sideways to count as a swipe. */
const SWIPE_DISTANCE = 60;
/** A swipe must be this many times more sideways than vertical. */
const SWIPE_RATIO = 1.5;
/** How far (px) a finger moves before it is clear whether it is a swipe. */
const SWIPE_START = 8;
/** How much of the drag the window follows when there is no neighbour. */
const SWIPE_RESISTANCE = 0.25;
const SWIPE_MS = 180;

const FOCUSABLE =
  'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Whether the element, or a parent below `root`, scrolls sideways itself. */
function scrollsSideways(element: HTMLElement | null, root: HTMLElement) {
  for (let el = element; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth <= el.clientWidth) continue;
    const overflowX = getComputedStyle(el).overflowX;
    if (overflowX === "auto" || overflowX === "scroll") return true;
  }
  return false;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Transform that makes the panel look like the given card rect. */
function transformFrom(card: DOMRect, panel: DOMRect) {
  const scale = card.width / panel.width;
  const dx = card.left + card.width / 2 - (panel.left + panel.width / 2);
  const dy = card.top + card.height / 2 - (panel.top + panel.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

function NeighborButton({
  direction,
  neighbor,
  onSelect,
}: {
  direction: "previous" | "next";
  neighbor: Neighbor | null;
  onSelect: (id: number) => void;
}) {
  const { t } = useLanguage();
  const label = t(direction === "previous" ? "detail.previous" : "detail.next");
  return (
    <button
      type="button"
      disabled={!neighbor}
      onClick={() => neighbor && onSelect(neighbor.id)}
      aria-label={neighbor ? `${label}: ${neighbor.name}` : label}
      className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-selected disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direction === "previous" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"} />
      </svg>
    </button>
  );
}

export function PokemonModal({
  entry,
  originRect,
  onClose,
  onSelectPokemon,
  previous,
  next,
  initialTypes,
  initialNames,
  shinyIds,
  onToggleShiny,
  onSetShiny,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);
  // True while the window slides after a swipe; a new swipe must wait.
  const busyRef = useRef(false);
  const { language, t } = useLanguage();
  // The chosen form belongs to one species; moving to another one resets it.
  const [formChoice, setFormChoice] = useState<{
    speciesId: number;
    formId: number;
  } | null>(null);
  if (formChoice && formChoice.speciesId !== entry.id) setFormChoice(null);
  const formId = formChoice?.formId ?? null;
  const { detail, loading, failed, retry } = usePokemonDetail(entry.id, formId);
  const {
    sprites: formSprites,
    loading: formDataLoading,
  } = usePokemonFormSprites(
    entry.id,
    detail?.forms ?? [],
  );
  // A regional form in the evolution chain opens that form, also on another species.
  const selectInChain = (id: number, regionalFormId?: number) => {
    if (regionalFormId !== undefined)
      setFormChoice({ speciesId: id, formId: regionalFormId });
    if (id !== entry.id) onSelectPokemon(id);
  };
  const currentFormId =
    formId ?? detail?.forms.find((form) => form.isDefault)?.id ?? null;

  // A form without shiny artwork is shown normally.
  const shiny = shinyIds.has(entry.id);
  const shinyOn = shiny && (!detail || detail.shinyArtwork !== null);

  // The game you picked stays while you browse, as long as the Pokémon on
  // screen has moves in it; otherwise its newest game is shown. Without moves
  // (e.g. Gigantamax) there are no games, so no history either.
  const [preferredGame, setPreferredGame] = useState<string | null>(null);
  const game =
    detail && preferredGame && detail.games.includes(preferredGame)
      ? preferredGame
      : (detail?.defaultGame ?? null);
  const moves = usePokemonMoves(entry.id, detail?.pokemonId ?? null, game);
  const shown = detail && game ? detailForGame(detail, game) : detail;
  const placeholders = !detail && !failed;

  // The heart belongs to the form on screen.
  const { keys: favoriteKeys, toggle: toggleFavorite } = useFavorites();
  const favoriteKey = makeFavoriteKey(
    entry.id,
    currentFormId,
    detail?.forms.find((form) => form.isDefault)?.id ?? null,
  );
  const isFavorite = favoriteKeys.includes(favoriteKey);

  // Grow out of the clicked card.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop || prefersReducedMotion()) return;

    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: OPEN_MS,
      easing: "ease-out",
    });
    const from = originRect
      ? { transform: transformFrom(originRect, panel.getBoundingClientRect()) }
      : { transform: "scale(0.94)" };
    panel.animate(
      [
        { ...from, opacity: originRect ? 0.6 : 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: OPEN_MS, easing: EASING },
    );
    // Only on mount; later changes of the origin must not replay the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestClose = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (closingRef.current) return;
    closingRef.current = true;

    if (!panel || !backdrop || prefersReducedMotion()) {
      onClose();
      return;
    }

    // Shrink back into the card if it is still on screen.
    const card = document
      .querySelector(`[data-pokemon-card="${entry.id}"]`)
      ?.getBoundingClientRect();
    const cardVisible =
      card && card.bottom > 0 && card.top < window.innerHeight;
    const to = cardVisible
      ? transformFrom(card, panel.getBoundingClientRect())
      : "scale(0.94)";

    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: "ease-in",
      fill: "forwards",
    });
    panel
      .animate(
        [
          { transform: "none", opacity: 1 },
          { transform: to, opacity: cardVisible ? 0.6 : 0 },
        ],
        { duration: CLOSE_MS, easing: "ease-in", fill: "forwards" },
      )
      .finished.then(onClose, onClose);
  }, [entry.id, onClose]);

  // Keyboard: Escape closes, Tab stays inside the window.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
        return;
      }
      // Left and right go to the neighbours, unless the arrows are in use
      // (text fields, the move tabs, a scrolling table).
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const target = event.target as HTMLElement | null;
        const taken = target?.closest(
          'input, select, textarea, [role="tab"], [role="region"]',
        );
        const neighbor = event.key === "ArrowLeft" ? previous : next;
        const modified =
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
        if (!taken && neighbor && !modified) {
          event.preventDefault();
          onSelectPokemon(neighbor.id);
        }
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
  }, [requestClose, previous, next, onSelectPokemon]);

  // Swiping sideways goes to the next or previous Pokémon, like the arrows in
  // the header: the window follows the finger and slides away on release.
  // Not when it would also scroll something sideways (the evolution chain, a
  // wide table) or when the fields use the gesture. These are native
  // listeners because `touchmove` has to be able to stop the page scrolling.
  useEffect(() => {
    const found = panelRef.current;
    if (!found) return;
    const panel: HTMLDivElement = found;
    let swipe: { x: number; y: number; dragging: boolean } | null = null;

    const look = () => ({
      transform: panel.style.transform || "none",
      opacity: panel.style.opacity || "1",
    });
    const clear = () => {
      panel.style.transform = "";
      panel.style.opacity = "";
    };
    const springBack = () => {
      const from = look();
      clear();
      busyRef.current = true;
      panel
        .animate([from, { transform: "none", opacity: "1" }], {
          duration: SWIPE_MS,
          easing: EASING,
        })
        .finished.catch(() => {})
        .finally(() => {
          busyRef.current = false;
        });
    };
    const slideTo = (neighbor: Neighbor, direction: -1 | 1) => {
      if (prefersReducedMotion()) {
        clear();
        onSelectPokemon(neighbor.id);
        return;
      }
      const from = look();
      clear();
      busyRef.current = true;
      // Out the way the finger went, in from the other side.
      const out = panel.animate(
        [
          from,
          {
            transform: `translateX(${direction * window.innerWidth * 0.6}px)`,
            opacity: "0",
          },
        ],
        { duration: SWIPE_MS, easing: "ease-in", fill: "forwards" },
      );
      out.finished
        .then(() => {
          out.cancel();
          onSelectPokemon(neighbor.id);
          return panel.animate(
            [
              {
                transform: `translateX(${-direction * window.innerWidth * 0.3}px)`,
                opacity: "0",
              },
              { transform: "none", opacity: "1" },
            ],
            { duration: SWIPE_MS, easing: EASING },
          ).finished;
        })
        .catch(() => {})
        .finally(() => {
          busyRef.current = false;
        });
    };

    function onTouchStart(event: TouchEvent) {
      const target = event.target as HTMLElement;
      const taken =
        busyRef.current ||
        closingRef.current ||
        event.touches.length !== 1 ||
        target.closest('input, select, textarea, [role="tab"]') !== null ||
        scrollsSideways(target, panel);
      const touch = event.touches[0];
      swipe = taken
        ? null
        : { x: touch.clientX, y: touch.clientY, dragging: false };
    }

    function onTouchMove(event: TouchEvent) {
      if (!swipe) return;
      if (event.touches.length !== 1) {
        // A second finger (a pinch) cancels the swipe.
        if (swipe.dragging) springBack();
        swipe = null;
        return;
      }
      const dx = event.touches[0].clientX - swipe.x;
      const dy = event.touches[0].clientY - swipe.y;
      if (!swipe.dragging) {
        if (Math.abs(dx) < SWIPE_START && Math.abs(dy) < SWIPE_START) return;
        if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) {
          // Mostly vertical: an ordinary scroll.
          swipe = null;
          return;
        }
        swipe.dragging = true;
      }
      event.preventDefault();
      // Without a neighbour in that direction the window only gives a little.
      const neighbor = dx < 0 ? next : previous;
      const offset = neighbor ? dx : dx * SWIPE_RESISTANCE;
      panel.style.transform = `translateX(${offset}px)`;
      panel.style.opacity = String(
        1 - Math.min(Math.abs(offset) / panel.offsetWidth, 1) * 0.5,
      );
    }

    function onTouchEnd(event: TouchEvent) {
      const finished = swipe;
      swipe = null;
      if (!finished?.dragging) return;
      const dx = event.changedTouches[0].clientX - finished.x;
      const neighbor = dx < 0 ? next : previous;
      if (neighbor && Math.abs(dx) >= SWIPE_DISTANCE) {
        // Dragging left turns the page forward, like a book.
        slideTo(neighbor, dx < 0 ? -1 : 1);
      } else if (prefersReducedMotion()) {
        clear();
      } else {
        springBack();
      }
    }

    function onTouchCancel() {
      if (swipe?.dragging) springBack();
      swipe = null;
    }

    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });
    panel.addEventListener("touchend", onTouchEnd, { passive: true });
    panel.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
      panel.removeEventListener("touchend", onTouchEnd);
      panel.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [previous, next, onSelectPokemon]);

  // A newly selected Pokémon starts at the top of the window.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
    // A button that has just become disabled (the last neighbour) drops focus.
    const active = document.activeElement;
    if (
      !panelRef.current?.contains(active) ||
      (active instanceof HTMLButtonElement && active.disabled)
    ) {
      closeButtonRef.current?.focus();
    }
  }, [entry.id]);

  // Lock page scroll and hand focus back to the opener afterwards.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const gameSprite = detail
    ? spriteForGameOrLatest(detail.gameSprites, game, shinyOn)
    : null;
  const [showSprite, setShowSprite] = useState(true);
  const spriteView = showSprite && gameSprite !== null;
  const artwork =
    (shinyOn ? detail?.shinyArtwork : detail?.artwork) ??
    artworkUrl(entry.id, shinyOn);
  const showImageToggle = hasSpriteToggle(gameSprite, artwork);

  const name =
    pickText(detail?.names ?? initialNames, language) ?? formatName(entry.name);
  const description =
    detail && game
      ? descriptionForGame(detail, game, language)
      : {
          text: pickText(detail?.descriptions, language),
          fromGame: null as string | null,
        };

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pokemon-dialog-title"
        className="relative h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl lg:max-w-5xl"
        style={{
          background: typeBackground(shown?.types ?? initialTypes ?? []),
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-surface/60 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-1">
            <NeighborButton
              direction="previous"
              neighbor={previous}
              onSelect={onSelectPokemon}
            />
            <span className="min-w-12 text-center text-sm font-medium text-muted">
              {formatNumber(entry.id)}
            </span>
            <NeighborButton
              direction="next"
              neighbor={next}
              onSelect={onSelectPokemon}
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Phones only get round icon buttons; the lists open on press. */}
            <div className="sm:hidden">
              <LanguageSelect round />
            </div>
            <div className="hidden shrink-0 sm:block">
              <LanguageSelect compact />
            </div>
            {placeholders && (
              <div aria-hidden="true" className="contents">
                <div className="skeleton size-9 rounded-full sm:hidden" />
                <div className="skeleton hidden h-9 w-64 rounded-lg sm:block" />
              </div>
            )}
            {game && detail && (
              <>
                <IconSelect
                  aria-label={t("moves.game")}
                  className="sm:hidden"
                  badge={
                    Number.isFinite(gameGeneration(game))
                      ? String(gameGeneration(game))
                      : undefined
                  }
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="6" width="20" height="12" rx="4" />
                      <path d="M7 10v4M5 12h4" />
                      <circle cx="15.5" cy="11" r="0.8" />
                      <circle cx="18" cy="13" r="0.8" />
                    </svg>
                  }
                  value={game}
                  onChange={(event) => setPreferredGame(event.target.value)}
                >
                  {detail.games.map((slug) => (
                    <option key={slug} value={slug}>
                      {formatGame(slug, language)}
                    </option>
                  ))}
                </IconSelect>
                {/* A fixed width, so the header does not jump when a form has
                    fewer (or shorter named) games. */}
                <div className="hidden min-w-0 sm:block sm:w-64">
                  <Select
                    compact
                    aria-label={t("moves.game")}
                    className="h-9 w-full"
                    value={game}
                    onChange={(event) => setPreferredGame(event.target.value)}
                  >
                    {detail.games.map((slug) => (
                      <option key={slug} value={slug}>
                        {formatGame(slug, language)}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}
            <ThemeToggle round />
            <FavoriteButton
              active={isFavorite}
              label={`${formatName(entry.name)} ${t(isFavorite ? "favorites.remove" : "favorites.add")}`}
              onToggle={() => toggleFavorite(favoriteKey)}
              className="bg-surface-muted"
            />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={requestClose}
              aria-label={t("detail.close")}
              className="flex size-9 items-center justify-center rounded-full bg-surface-muted text-lg leading-none hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
            >
              ×
            </button>
          </div>
        </div>

        <div className="relative px-4 pb-6 pt-2 sm:px-8 sm:pb-8">
          <header className="mb-6 grid grid-cols-1 items-center justify-items-center gap-6 text-center sm:grid-cols-[auto_1fr_auto] sm:justify-items-start sm:gap-x-8 sm:text-left">
            <div className="relative size-40 sm:size-48">
              {/* The game sprite is only known once the details are in, so the
                  artwork would show first and then be swapped for it. */}
              {placeholders && showSprite ? (
                <div
                  aria-hidden="true"
                  className="skeleton size-full rounded-3xl"
                />
              ) : spriteView ? (
                <Image
                  src={gameSprite}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className="size-full object-contain [image-rendering:pixelated]"
                />
              ) : (
                <Image
                  src={artwork}
                  alt=""
                  width={475}
                  height={475}
                  sizes="192px"
                  className="size-full object-contain"
                  priority
                />
              )}
              {showImageToggle && gameSprite && (
                <button
                  type="button"
                  onClick={() => setShowSprite(!spriteView)}
                  aria-pressed={spriteView}
                  aria-label={t(
                    spriteView ? "detail.showArtwork" : "detail.showSprite",
                  )}
                  title={
                    spriteView
                      ? t("detail.showArtwork")
                      : game
                        ? formatGame(game, language)
                        : t("detail.showSprite")
                  }
                  className="absolute bottom-0 right-0 size-14 rounded-xl border border-border/60 bg-surface/90 p-1 shadow-sm hover:bg-border focus-visible:outline-2 focus-visible:outline-selected"
                >
                  {spriteView ? (
                    <Image
                      src={artwork}
                      alt=""
                      width={80}
                      height={80}
                      sizes="80px"
                      className="size-full object-contain"
                    />
                  ) : (
                    <Image
                      src={gameSprite}
                      alt=""
                      width={96}
                      height={96}
                      unoptimized
                      className="size-full object-contain [image-rendering:pixelated]"
                    />
                  )}
                </button>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <h2 id="pokemon-dialog-title" className="text-3xl font-bold">
                {name}
              </h2>
              {/* Always there, so the types do not drop a line when it loads. */}
              {placeholders ? (
                <TitleSkeleton />
              ) : (
                <>
                  <p className="min-h-5 text-sm text-muted">
                    {pickText(detail?.genus, language)}
                  </p>
                  <div className="flex min-h-6 flex-wrap justify-center gap-1.5 sm:justify-start">
                    {shown?.types.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-60 sm:self-start lg:w-[26rem]">
              {placeholders && <CrySkeleton />}
              {detail?.cry && (
                <div className="flex justify-center sm:justify-end">
                  <CryButton key={detail.cry} url={detail.cry} />
                </div>
              )}
              {detail && (
                <div className={`hidden min-w-0 sm:block ${CARD}`}>
                  <FormPicker
                    speciesName={detail.speciesName}
                    forms={detail.forms}
                    sprites={formSprites}
                    formDataLoading={formDataLoading}
                    game={game}
                    showSprite={showSprite}
                    currentFormId={currentFormId ?? detail.pokemonId}
                    onSelect={(selected) =>
                      setFormChoice({ speciesId: entry.id, formId: selected })
                    }
                    shiny={detail.shinyArtwork !== null ? shinyOn : null}
                    onToggleShiny={onToggleShiny}
                  />
                </div>
              )}
              {placeholders && (
                <div className={`hidden min-w-0 sm:block ${CARD}`}>
                  <FormPickerSkeleton />
                </div>
              )}
            </div>
          </header>

          <div className="mb-6 grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
            {detail && (
              <div className={`sm:hidden ${CARD}`}>
                <FormPicker
                  speciesName={detail.speciesName}
                  forms={detail.forms}
                  sprites={formSprites}
                  formDataLoading={formDataLoading}
                  game={game}
                  showSprite={showSprite}
                  currentFormId={currentFormId ?? detail.pokemonId}
                  onSelect={(selected) =>
                    setFormChoice({ speciesId: entry.id, formId: selected })
                  }
                  shiny={detail.shinyArtwork !== null ? shinyOn : null}
                  onToggleShiny={onToggleShiny}
                />
              </div>
            )}
            {description.text && (
              <div className={`${CARD} text-left lg:self-start`}>
                <p className="leading-relaxed">{description.text}</p>
                {description.fromGame && (
                  <p className="mt-1 text-xs text-muted">
                    {t("detail.descriptionFrom")}{" "}
                    {formatGame(description.fromGame, language)}
                  </p>
                )}
              </div>
            )}
            {detail && (
              <div className="hidden min-w-0 sm:block lg:self-center">
                <PokemonFacts detail={shown ?? detail} />
              </div>
            )}
            {detail && (
              <div className="sm:hidden">
                <PokemonFacts detail={shown ?? detail} />
              </div>
            )}
            {placeholders && <IntroSkeleton />}
          </div>

          {detail ? (
            <div
              aria-busy={loading}
              className={`transition-opacity ${loading ? "opacity-70" : ""}`}
            >
              {failed && (
                <div
                  role="alert"
                  className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"
                >
                  <span>{t("detail.error")}</span>
                  <button
                    type="button"
                    onClick={retry}
                    className="rounded-md bg-accent-solid px-3 py-1 font-medium text-white"
                  >
                    {t("common.retry")}
                  </button>
                </div>
              )}
              <PokemonDetails
                detail={shown ?? detail}
                moves={moves}
                onSelectPokemon={selectInChain}
                shinyIds={shinyIds}
                onSetShiny={onSetShiny}
                game={game}
                showSprite={showSprite}
              />
            </div>
          ) : failed ? (
            <div role="alert" className="flex flex-col items-center gap-3 py-8">
              <p className="text-muted">{t("detail.error")}</p>
              <button
                type="button"
                onClick={retry}
                className="rounded-md bg-accent-solid px-4 py-2 font-medium text-white"
              >
                {t("common.retry")}
              </button>
            </div>
          ) : (
            <DetailsSkeleton />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
