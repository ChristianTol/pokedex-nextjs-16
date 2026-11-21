import { pickText, type Language } from "@/lib/i18n/languages";
import type { MessageKey } from "@/lib/i18n/messages";
import type {
  EvolutionMethod,
  EvolutionNode,
  NamedRef,
} from "@/lib/pokeapi/detail";
import { formatName } from "./format";
import { descriptionGame, releaseIndex } from "./games";

/** The species ids of every stage in an evolution family, including branches. */
export function evolutionIds(node: EvolutionNode): number[] {
  return [node.id, ...node.evolvesTo.flatMap(evolutionIds)];
}

/** Pokémon IDs to fetch for the forms selected in an evolution tree. */
export function evolutionSpriteIds(node: EvolutionNode): number[] {
  return [
    ...new Set([
      node.formId ?? node.id,
      ...node.evolvesTo.flatMap(evolutionSpriteIds),
    ]),
  ];
}

/**
 * The ways to evolve that apply in a game. PokéAPI lists alternatives and
 * per-game versions together, so, in order:
 * 1. a way made for exactly this game;
 * 2. the one PokéAPI marks as the usual one, unless it is for a newer game
 *    (which did not exist yet);
 * 3. the way for the closest older game (Platinum gets Diamond/Pearl's);
 * 4. otherwise the usual one, or every way.
 * An expansion uses its main game.
 */
export function methodsForGame(
  methods: readonly EvolutionMethod[],
  game: string | null,
): EvolutionMethod[] {
  if (methods.length <= 1) return [...methods];
  const usual = methods.filter((method) => method.isDefault);
  const own = game ? descriptionGame(game) : null;
  if (own) {
    const exact = methods.filter((method) => method.game === own);
    if (exact.length > 0) return exact;

    const ownIndex = releaseIndex(own);
    const indexOf = (method: EvolutionMethod) =>
      method.game === null ? -1 : releaseIndex(method.game);
    const usualThen = usual.filter((method) => indexOf(method) <= ownIndex);
    if (usualThen.length > 0) return usualThen;

    const older = methods.filter(
      (method) => indexOf(method) >= 0 && indexOf(method) < ownIndex,
    );
    if (older.length > 0) {
      const closest = Math.max(...older.map(indexOf));
      return older.filter((method) => indexOf(method) === closest);
    }
  }
  return usual.length > 0 ? usual : [...methods];
}

export type LabelContext = {
  t: (key: MessageKey) => string;
  tOptional: (key: string) => string | null;
  language: Language;
};

const TIME_OF_DAY: Record<string, MessageKey> = {
  day: "evo.day",
  night: "evo.night",
  dusk: "evo.dusk",
  "full-moon": "evo.fullMoon",
};

/** Triggers that are a fixed text and nothing else. */
const FIXED_TRIGGERS: Record<string, MessageKey> = {
  spin: "evo.spin",
  shed: "evo.shed",
  "gimmighoul-coins": "evo.gimmighoulCoins",
  "tower-of-darkness": "evo.towerDarkness",
  "tower-of-waters": "evo.towerWaters",
  "meltan-candies": "evo.meltanCandies",
  "three-defeated-bisharp": "evo.threeBisharp",
  "three-critical-hits": "evo.threeCrits",
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/** What one way of evolving asks for, e.g. "Happiness ≥ 160 · Daytime". */
export function evolutionLabel(
  method: EvolutionMethod,
  { t, tOptional, language }: LabelContext,
): string {
  const name = (ref: NamedRef) =>
    pickText(ref.names, language) ?? formatName(ref.name);
  const typeName = (type: string) =>
    tOptional(`type.${type}`) ?? formatName(type);
  const parts: string[] = [];

  const level =
    method.level === undefined
      ? null
      : `${t("evolution.level")} ${method.level}`;
  switch (method.trigger) {
    case "level-up":
      parts.push(level ?? t("evo.levelUp"));
      break;
    case "in-battle-level-up":
      if (level) parts.push(level);
      parts.push(t("evo.levelUpInBattle"));
      break;
    case "use-item":
      if (method.item) parts.push(name(method.item));
      break;
    case "trade":
      parts.push(t("evolution.trade"));
      if (method.tradeSpecies) {
        parts.push(
          fill(t("evo.tradeFor"), { species: formatName(method.tradeSpecies) }),
        );
      }
      break;
    case "use-move":
    case "strong-style-move":
    case "agile-style-move":
      if (method.usedMove) {
        parts.push(
          fill(t("evo.useMove"), {
            move: name(method.usedMove),
            n: method.moveCount ?? 1,
          }),
        );
      }
      break;
    case "recoil-damage":
      parts.push(fill(t("evo.recoil"), { n: method.damageTaken ?? 0 }));
      break;
    case "take-damage":
      parts.push(fill(t("evo.takeDamage"), { n: method.damageTaken ?? 0 }));
      break;
    default: {
      const fixed = FIXED_TRIGGERS[method.trigger];
      if (fixed) parts.push(t(fixed));
    }
  }

  if (method.heldItem)
    parts.push(fill(t("evo.holding"), { item: name(method.heldItem) }));
  if (method.timeOfDay && TIME_OF_DAY[method.timeOfDay]) {
    parts.push(t(TIME_OF_DAY[method.timeOfDay]));
  }
  if (method.happiness !== undefined) {
    parts.push(fill(t("evo.happiness"), { n: method.happiness }));
  }
  if (method.affection !== undefined) {
    parts.push(fill(t("evo.affection"), { n: method.affection }));
  }
  if (method.beauty !== undefined)
    parts.push(fill(t("evo.beauty"), { n: method.beauty }));
  if (method.knownMove)
    parts.push(fill(t("evo.knows"), { move: name(method.knownMove) }));
  if (method.knownMoveType) {
    parts.push(
      fill(t("evo.knowsType"), { type: typeName(method.knownMoveType) }),
    );
  }
  if (method.location)
    parts.push(fill(t("evo.location"), { place: name(method.location) }));
  if (method.nearRock) parts.push(t("evo.nearRock"));
  if (method.gender === 1) parts.push(t("detail.female"));
  if (method.gender === 2) parts.push(t("detail.male"));
  if (method.region) {
    parts.push(
      fill(t("evo.region"), {
        region:
          tOptional(`region.${method.region}`) ?? formatName(method.region),
      }),
    );
  }
  if (method.steps !== undefined)
    parts.push(fill(t("evo.steps"), { n: method.steps }));
  if (method.rain) parts.push(t("evo.rain"));
  if (method.statsRelation === 1) parts.push(t("evo.attackHigher"));
  if (method.statsRelation === -1) parts.push(t("evo.defenseHigher"));
  if (method.statsRelation === 0) parts.push(t("evo.statsEqual"));
  if (method.multiplayer) parts.push(t("evo.multiplayer"));
  if (method.upsideDown) parts.push(t("evo.upsideDown"));
  if (method.partyType) {
    parts.push(fill(t("evo.partyType"), { type: typeName(method.partyType) }));
  }
  if (method.partySpecies) {
    parts.push(
      fill(t("evo.partySpecies"), { species: formatName(method.partySpecies) }),
    );
  }

  return parts.length > 0 ? parts.join(" · ") : formatName(method.trigger);
}

/** The labels of the ways that apply in a game, without doubles. */
export function evolutionLabels(
  methods: readonly EvolutionMethod[],
  game: string | null,
  context: LabelContext,
): string[] {
  return [
    ...new Set(
      methodsForGame(methods, game).map((method) =>
        evolutionLabel(method, context),
      ),
    ),
  ];
}

/** One way of evolving: what it asks for in words, and the items it needs. */
export type EvolutionStep = { label: string; items: string[] };

/** The ways that apply in a game, each with its own items, without doubles. */
export function evolutionSteps(
  methods: readonly EvolutionMethod[],
  game: string | null,
  context: LabelContext,
): EvolutionStep[] {
  const steps = new Map<string, EvolutionStep>();
  for (const method of methodsForGame(methods, game)) {
    const label = evolutionLabel(method, context);
    if (steps.has(label)) continue;
    const items = [method.item, method.heldItem].flatMap((ref) =>
      ref ? [ref.name] : [],
    );
    steps.set(label, { label, items });
  }
  return [...steps.values()];
}

/** The small PokéAPI picture of an item, e.g. "moon-stone". */
export function itemSpriteUrl(item: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item}.png`;
}

const REGION = /-(alola|galar|hisui|paldea)(?:-|$)/;

/** The regional form a Pokémon slug is, e.g. "ninetales-alola" is "alola". */
export function regionOf(slug: string | undefined): string | null {
  return (slug && REGION.exec(slug)?.[1]) || null;
}

const methodRegion = (method: EvolutionMethod) =>
  regionOf(method.evolvedForm) ?? regionOf(method.requiredForm);

/**
 * The evolution tree as it applies to the Pokémon on screen. The chain is
 * shared by a species and its regional forms, so:
 * - a step keeps the ways of the viewed form's region (or, failing that, all
 *   of them): Ice Stone only works on Alolan Vulpix, Fire Stone on the other;
 * - where a stage splits into branches that differ by region (Wooper to
 *   Quagsire, Paldean Wooper to Clodsire), only the branch of the viewed form
 *   is kept, or the one the Pokémon on screen is part of;
 * - the stages get the regional form's id, to show the right picture.
 */
export function evolutionForForm(
  root: EvolutionNode,
  formName: string,
  currentId: number,
): EvolutionNode {
  const region = regionOf(formName);
  const formIdOf = (node: EvolutionNode, slug: string | undefined) =>
    slug && regionOf(slug) ? node.varieties?.[slug] : undefined;

  const visit = (node: EvolutionNode, incoming?: string): EvolutionNode => {
    let branches = node.evolvesTo.map((child) => {
      const matching = child.methods.filter(
        (method) => methodRegion(method) === region,
      );
      const methods = matching.length > 0 ? matching : child.methods;
      return {
        child: { ...child, methods },
        // Has a way for the viewed form's region (none for the ordinary form).
        forThisForm: child.methods.some(
          (method) => methodRegion(method) === region,
        ),
        holdsCurrent: evolutionIds(child).includes(currentId),
        required: methods.find((m) => regionOf(m.requiredForm))?.requiredForm,
        evolved: methods.find((m) => regionOf(m.evolvedForm))?.evolvedForm,
      };
    });

    if (!branches.every((branch) => branch.forThisForm)) {
      const holding = branches.filter((branch) => branch.holdsCurrent);
      const fitting = branches.filter((branch) => branch.forThisForm);
      if (holding.length > 0) branches = holding;
      else if (fitting.length > 0) branches = fitting;
    }

    // The stage is the regional form only if every branch asks for it.
    const required = branches[0]?.required;
    const sameForm = branches.every((branch) => branch.required === required);
    const formId =
      formIdOf(node, incoming) ??
      (sameForm ? formIdOf(node, required) : undefined);
    return {
      ...node,
      ...(formId !== undefined && { formId }),
      evolvesTo: branches.map((branch) => visit(branch.child, branch.evolved)),
    };
  };
  return visit(root);
}
