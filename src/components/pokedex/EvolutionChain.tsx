import Image from "next/image";
import { useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { pickText } from "@/lib/i18n/languages";
import type { EvolutionNode } from "@/lib/pokeapi/detail";
import { artworkUrl, formatName, formatNumber } from "@/lib/pokedex/format";
import {
  evolutionForForm,
  evolutionIds,
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
}: {
  methods: EvolutionNode["methods"];
  game: string | null;
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
  const frame =
    "flex min-w-12 max-w-36 flex-col items-center gap-0.5 text-muted";
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

function EvolutionButton({
  node,
  current,
  onSelect,
  shiny,
}: {
  node: EvolutionNode;
  current: boolean;
  /** `formId` is set for a regional form such as Alolan Ninetales. */
  onSelect: (id: number, formId?: number) => void;
  shiny: boolean;
}) {
  const { language } = useLanguage();
  const name = pickText(node.names, language) ?? formatName(node.name);
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id, node.formId)}
      aria-current={current ? "true" : undefined}
      className={`flex w-24 flex-col sm:w-28 lg:w-24 xl:w-28 items-center gap-1 rounded-xl border p-2 text-center transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected ${
        current ? "border-selected bg-surface-muted" : "border-border"
      }`}
    >
      <Image
        src={artworkUrl(node.formId ?? node.id, shiny)}
        alt=""
        width={96}
        height={96}
        className="size-20 object-contain"
      />
      <span className="text-xs text-muted">{formatNumber(node.id)}</span>
      <span className="text-sm font-medium">{name}</span>
    </button>
  );
}

function Branch({
  node,
  currentId,
  onSelect,
  shinyIds,
  game,
}: {
  node: EvolutionNode;
  currentId: number;
  /** `formId` is set for a regional form such as Alolan Ninetales. */
  onSelect: (id: number, formId?: number) => void;
  shinyIds: ReadonlySet<number>;
  game: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row">
      <EvolutionButton
        node={node}
        current={node.id === currentId}
        onSelect={onSelect}
        shiny={shinyIds.has(node.id)}
      />
      {node.evolvesTo.length > 0 && (
        <div className="flex flex-col gap-3">
          {node.evolvesTo.map((child) => (
            <div
              key={child.id}
              className="flex flex-col items-center gap-2 sm:flex-row"
            >
              <Arrow methods={child.methods} game={game} />
              <Branch
                node={child}
                currentId={currentId}
                onSelect={onSelect}
                shinyIds={shinyIds}
                game={game}
              />
            </div>
          ))}
        </div>
      )}
    </div>
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
}: Props) {
  const { t } = useLanguage();
  const root = useMemo(
    () => evolutionForForm(familyRoot, formName, currentId),
    [familyRoot, formName, currentId],
  );
  if (root.evolvesTo.length === 0) {
    return <p className="text-sm text-muted">{t("detail.noEvolution")}</p>;
  }
  const family = evolutionIds(root);
  const allShiny = family.every((id) => shinyIds.has(id));
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onSetShiny(family, !allShiny)}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1 text-sm transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected"
      >
        <SparkleIcon />
        {t(allShiny ? "evolution.normalFamily" : "evolution.shinyFamily")}
      </button>
      <div className="overflow-x-auto pb-1">
        <Branch
          node={root}
          currentId={currentId}
          onSelect={onSelect}
          shinyIds={shinyIds}
          game={game}
        />
      </div>
    </div>
  );
}
