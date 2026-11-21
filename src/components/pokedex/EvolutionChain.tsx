import Image from "next/image";
import { useMemo, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { usePokemonEvolutionSprites } from "@/hooks/usePokemonEvolutionSprites";
import { pickText } from "@/lib/i18n/languages";
import type { EvolutionNode, PokemonFormSprites } from "@/lib/pokeapi/detail";
import { artworkUrl, formatName, formatNumber } from "@/lib/pokedex/format";
import { formSpriteCandidates } from "@/lib/pokedex/game-detail";
import {
  evolutionForForm,
  evolutionIds,
  evolutionSpriteIds,
  evolutionSteps,
  type EvolutionStep,
} from "@/lib/pokedex/evolution";
import { ItemSprite } from "./ItemSprite";
import { SparkleIcon } from "./SparkleIcon";

type Props = {
  root: EvolutionNode;
  /** Pokémon slug of the form on screen; picks the regional branch. */
  formName: string;
  currentId: number;
  /** `formId` is set for a regional form such as Alolan Ninetales. */
  onSelect: (id: number, formId?: number) => void;
  /** Species that are shown shiny. */
  shinyIds: ReadonlySet<number>;
  /** Turns shiny on or off for several species at once. */
  onSetShiny: (ids: readonly number[], on: boolean) => void;
  /** The game chosen in the window; picks the ways to evolve that apply. */
  game: string | null;
  /** Whether game sprites or artwork are selected in the window. */
  showSprite: boolean;
};

/** One way of evolving: its item pictures with the words under them. */
function Step({ step }: { step: EvolutionStep }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <ItemSprites items={step.items} />
      <span className="text-center text-xs">{step.label}</span>
    </div>
  );
}

function ItemSprites({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {items.map((item) => (
        <ItemSprite key={item} item={item} />
      ))}
    </span>
  );
}

function Arrow({
  methods,
  game,
  fixedWidth,
}: {
  methods: EvolutionNode["methods"];
  game: string | null;
  /** Siblings share one width so the cards after their arrows line up. */
  fixedWidth: boolean;
}) {
  const { t, tOptional, language } = useLanguage();
  const steps = evolutionSteps(methods, game, { t, tOptional, language });
  const arrow = (
    <>
      <span aria-hidden="true" className="hidden text-xl sm:inline">
        →
      </span>
      <span aria-hidden="true" className="text-xl sm:hidden">
        ↓
      </span>
    </>
  );
  const frame = `flex flex-col items-center gap-0.5 text-muted ${
    fixedWidth
      ? "w-24 shrink-0 max-sm:grow max-sm:justify-end sm:w-28"
      : "min-w-12 max-w-36"
  }`;
  // One way: the item above the arrow, the words below it. Several ways: each
  // keeps its picture and words together, the first above and the rest below.
  if (steps.length <= 1) {
    const [only] = steps;
    return (
      <div className={frame}>
        {only && <ItemSprites items={only.items} />}
        {arrow}
        {only && <span className="text-center text-xs">{only.label}</span>}
      </div>
    );
  }
  const [first, ...rest] = steps;
  return (
    <div className={`${frame} gap-1.5`}>
      <Step step={first} />
      <div className="flex flex-col items-center">{arrow}</div>
      {rest.map((step) => (
        <Step key={step.label} step={step} />
      ))}
    </div>
  );
}

/** From this many evolutions on, they are shown as a grid instead of a column. */
const GRID_FROM = 4;

/** The ways of evolving as a small caption above a card in the grid. */
function Method({
  methods,
  game,
}: {
  methods: EvolutionNode["methods"];
  game: string | null;
}) {
  const { t, tOptional, language } = useLanguage();
  const steps = evolutionSteps(methods, game, { t, tOptional, language });
  if (steps.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-1 text-muted">
      {steps.map((step) => (
        <Step key={step.label} step={step} />
      ))}
    </div>
  );
}

function EvolutionButton({
  node,
  current,
  onSelect,
  shiny,
  game,
  showSprite,
  sprite,
}: {
  node: EvolutionNode;
  current: boolean;
  /** `formId` is set for a regional form such as Alolan Ninetales. */
  onSelect: (id: number, formId?: number) => void;
  shiny: boolean;
  game: string | null;
  showSprite: boolean;
  sprite: PokemonFormSprites | undefined;
}) {
  const { language } = useLanguage();
  const name = pickText(node.names, language) ?? formatName(node.name);
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id, node.formId)}
      aria-current={current ? "true" : undefined}
      className={`flex w-24 flex-col sm:w-28 lg:w-24 xl:w-28 items-center gap-1 rounded-xl border p-2 text-center transition-colors hover:border-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected ${
        current
          ? "border-selected bg-surface-muted"
          : "border-border"
      }`}
    >
      <EvolutionSprite
        key={`${node.formId ?? node.id}:${game ?? ""}:${shiny}:${showSprite}:${sprite ? JSON.stringify(sprite) : ""}`}
        id={node.formId ?? node.id}
        sprite={sprite}
        game={game}
        shiny={shiny}
        showSprite={showSprite}
      />
      <span className="text-xs text-muted">{formatNumber(node.id)}</span>
      <span className="text-sm font-medium">{name}</span>
    </button>
  );
}

function EvolutionSprite({
  id,
  sprite,
  game,
  shiny,
  showSprite,
}: {
  id: number;
  sprite: PokemonFormSprites | undefined;
  game: string | null;
  shiny: boolean;
  showSprite: boolean;
}) {
  const [failedCount, setFailedCount] = useState(0);
  const candidates = sprite
    ? formSpriteCandidates(sprite, game, shiny, showSprite)
    : [];
  const fallbackArtwork = artworkUrl(id, shiny);
  if (!candidates.includes(fallbackArtwork)) candidates.push(fallbackArtwork);
  const src = candidates[failedCount];
  return src ? (
    <Image
      src={src}
      alt=""
      width={96}
      height={96}
      unoptimized
      className={`size-20 object-contain ${showSprite ? "[image-rendering:pixelated]" : ""}`}
      onError={() => setFailedCount((count) => count + 1)}
    />
  ) : null;
}

function Branch({
  node,
  currentId,
  onSelect,
  shinyIds,
  game,
  showSprite,
  sprites,
}: {
  node: EvolutionNode;
  currentId: number;
  /** `formId` is set for a regional form such as Alolan Ninetales. */
  onSelect: (id: number, formId?: number) => void;
  shinyIds: ReadonlySet<number>;
  game: string | null;
  showSprite: boolean;
  sprites: ReadonlyMap<number, PokemonFormSprites>;
}) {
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row">
      <EvolutionButton
        node={node}
        current={node.id === currentId}
        onSelect={onSelect}
        shiny={shinyIds.has(node.id)}
        game={game}
        showSprite={showSprite}
        sprite={sprites.get(node.formId ?? node.id)}
      />
      {node.evolvesTo.length >= GRID_FROM && (
        <>
          <div aria-hidden="true" className="text-xl text-muted">
            <span className="hidden sm:inline">→</span>
            <span className="sm:hidden">↓</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {node.evolvesTo.map((child) => (
              <div key={child.id} className="flex flex-col items-center gap-1">
                <Method methods={child.methods} game={game} />
                <Branch
                  node={child}
                  currentId={currentId}
                  onSelect={onSelect}
                  shinyIds={shinyIds}
                  game={game}
                  showSprite={showSprite}
                  sprites={sprites}
                />
              </div>
            ))}
          </div>
        </>
      )}
      {node.evolvesTo.length > 0 && node.evolvesTo.length < GRID_FROM && (
        <div
          className={`flex gap-3 ${
            node.evolvesTo.length > 1
              ? "flex-row flex-wrap justify-center sm:flex-col sm:flex-nowrap sm:justify-start"
              : "flex-col"
          }`}
        >
          {node.evolvesTo.map((child) => (
            <div
              key={child.id}
              className="flex flex-col items-center gap-2 sm:flex-row"
            >
              <Arrow
                methods={child.methods}
                game={game}
                fixedWidth={node.evolvesTo.length > 1}
              />
              <Branch
                node={child}
                currentId={currentId}
                onSelect={onSelect}
                shinyIds={shinyIds}
                game={game}
                showSprite={showSprite}
                sprites={sprites}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The pokémon of the family on screen, for the form that is shown. */
function useFamilyRoot(
  familyRoot: EvolutionNode,
  formName: string,
  currentId: number,
) {
  return useMemo(
    () => evolutionForForm(familyRoot, formName, currentId),
    [familyRoot, formName, currentId],
  );
}

/**
 * Turns shiny on or off for the whole family. A Pokémon that does not evolve
 * gets nothing; the button would just repeat the one in the window.
 */
export function FamilyShinyButton({
  root: familyRoot,
  formName,
  currentId,
  shinyIds,
  onSetShiny,
  className,
}: Pick<
  Props,
  "root" | "formName" | "currentId" | "shinyIds" | "onSetShiny"
> & {
  /** Where and when the button is shown (its display); the window uses two. */
  className: string;
}) {
  const { t } = useLanguage();
  const root = useFamilyRoot(familyRoot, formName, currentId);
  if (root.evolvesTo.length === 0) return null;
  const family = evolutionIds(root);
  const allShiny = family.every((id) => shinyIds.has(id));
  return (
    <button
      type="button"
      onClick={() => onSetShiny(family, !allShiny)}
      className={`items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-normal transition-colors focus-visible:outline-2 focus-visible:outline-selected ${className} ${
        allShiny
          ? "border-selected bg-selected text-selected-text"
          : "border-border hover:bg-surface-muted"
      }`}
    >
      <SparkleIcon />
      {t(allShiny ? "evolution.normalFamily" : "evolution.shinyFamily")}
    </button>
  );
}

export function EvolutionChain({
  root: familyRoot,
  formName,
  currentId,
  onSelect,
  shinyIds,
  onSetShiny,
  game,
  showSprite,
}: Props) {
  const root = useFamilyRoot(familyRoot, formName, currentId);
  const spriteIds = useMemo(() => evolutionSpriteIds(root), [root]);
  const { sprites } = usePokemonEvolutionSprites(spriteIds);
  return (
    <div className="flex flex-col gap-3">
      {/* On a phone the button sits above the chain; from sm up it is in the
          header of the section. */}
      <FamilyShinyButton
        root={familyRoot}
        formName={formName}
        currentId={currentId}
        shinyIds={shinyIds}
        onSetShiny={onSetShiny}
        className="inline-flex self-start sm:hidden"
      />
      <div className="overflow-x-auto pb-1">
        <Branch
          node={root}
          currentId={currentId}
          onSelect={onSelect}
          shinyIds={shinyIds}
          game={game}
          showSprite={showSprite}
          sprites={sprites}
        />
      </div>
    </div>
  );
}
