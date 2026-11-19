import Image from "next/image";
import { useLanguage } from "@/hooks/useLanguage";
import { pickText } from "@/lib/i18n/languages";
import type { EvolutionNode } from "@/lib/pokeapi/detail";
import { artworkUrl, formatName, formatNumber } from "@/lib/pokedex/format";
import {
  evolutionIds,
  evolutionItems,
  evolutionLabels,
} from "@/lib/pokedex/evolution";
import { ItemSprite } from "./ItemSprite";
import { SparkleIcon } from "./SparkleIcon";

type Props = {
  root: EvolutionNode;
  currentId: number;
  onSelect: (id: number) => void;
  /** Species that are shown shiny. */
  shinyIds: ReadonlySet<number>;
  /** Turns shiny on or off for several species at once. */
  onSetShiny: (ids: readonly number[], on: boolean) => void;
  /** The game chosen in the window; picks the ways to evolve that apply. */
  game: string | null;
};

function Arrow({
  methods,
  game,
}: {
  methods: EvolutionNode["methods"];
  game: string | null;
}) {
  const { t, tOptional, language } = useLanguage();
  const labels = evolutionLabels(methods, game, { t, tOptional, language });
  const items = evolutionItems(methods, game);
  return (
    <div className="flex min-w-14 max-w-44 flex-col items-center gap-0.5 text-muted">
      {items.length > 0 && (
        <span aria-hidden="true" className="flex items-center gap-1">
          {items.map((item) => (
            <ItemSprite key={item} item={item} />
          ))}
        </span>
      )}
      <span aria-hidden="true" className="hidden text-xl sm:inline">
        →
      </span>
      <span aria-hidden="true" className="text-xl sm:hidden">
        ↓
      </span>
      {labels.map((label) => (
        <span key={label} className="text-center text-xs">
          {label}
        </span>
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
  onSelect: (id: number) => void;
  shiny: boolean;
}) {
  const { language } = useLanguage();
  const name = pickText(node.names, language) ?? formatName(node.name);
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      aria-current={current ? "true" : undefined}
      className={`flex w-28 flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected ${
        current ? "border-selected bg-surface-muted" : "border-border"
      }`}
    >
      <Image
        src={artworkUrl(node.id, shiny)}
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
  onSelect: (id: number) => void;
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
  root,
  currentId,
  onSelect,
  shinyIds,
  onSetShiny,
  game,
}: Props) {
  const { t } = useLanguage();
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
