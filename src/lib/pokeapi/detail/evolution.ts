import type { LocalizedText } from "@/lib/i18n/languages";
import { idFromUrl } from "../client";
import type {
  EvolutionMethod,
  EvolutionNode,
  NamedRef,
} from "./types";
import type {
  ChainLinkResponse,
  EvolutionDetailResponse,
  RefResponse,
} from "./responses";

const isSet = <T>(value: T | null | undefined | false | ""): value is T =>
  value !== null && value !== undefined && value !== false && value !== "";

const ref = (response: RefResponse | undefined): NamedRef | undefined =>
  response ? { name: response.name, names: {} } : undefined;

/** One entry of PokéAPI's `evolution_details`, keeping what is set. */
export function parseEvolutionMethod(
  detail: EvolutionDetailResponse,
): EvolutionMethod {
  const method: EvolutionMethod = {
    game: detail.version_group?.name ?? null,
    isDefault: detail.is_default ?? false,
    trigger: detail.trigger.name,
  };
  if (isSet(detail.min_level)) method.level = detail.min_level;
  const refs = {
    item: ref(detail.item),
    heldItem: ref(detail.held_item),
    knownMove: ref(detail.known_move),
    usedMove: ref(detail.used_move),
    location: ref(detail.location),
  };
  for (const [key, value] of Object.entries(refs)) {
    if (value) method[key as keyof typeof refs] = value;
  }
  if (detail.known_move_type)
    method.knownMoveType = detail.known_move_type.name;
  if (detail.party_type) method.partyType = detail.party_type.name;
  if (detail.party_species) method.partySpecies = detail.party_species.name;
  if (detail.trade_species) method.tradeSpecies = detail.trade_species.name;
  if (detail.region) method.region = detail.region.name;
  if (detail.required_pokemon_form)
    method.requiredForm = detail.required_pokemon_form.name;
  if (detail.evolved_pokemon_form)
    method.evolvedForm = detail.evolved_pokemon_form.name;
  if (isSet(detail.time_of_day)) method.timeOfDay = detail.time_of_day;
  if (isSet(detail.min_move_count)) method.moveCount = detail.min_move_count;
  if (isSet(detail.min_happiness)) method.happiness = detail.min_happiness;
  if (isSet(detail.min_affection)) method.affection = detail.min_affection;
  if (isSet(detail.min_beauty)) method.beauty = detail.min_beauty;
  if (isSet(detail.min_steps)) method.steps = detail.min_steps;
  if (isSet(detail.min_damage_taken))
    method.damageTaken = detail.min_damage_taken;
  if (isSet(detail.gender)) method.gender = detail.gender;
  if (isSet(detail.relative_physical_stats)) {
    method.statsRelation = detail.relative_physical_stats;
  }
  if (detail.near_special_rock) method.nearRock = true;
  if (detail.needs_overworld_rain) method.rain = true;
  if (detail.needs_multiplayer) method.multiplayer = true;
  if (detail.turn_upside_down) method.upsideDown = true;
  return method;
}

export function parseEvolution(link: ChainLinkResponse): EvolutionNode {
  return {
    id: idFromUrl(link.species.url),
    name: link.species.name,
    names: {},
    methods: link.evolution_details.map(parseEvolutionMethod),
    evolvesTo: link.evolves_to.map(parseEvolution),
  };
}

export type RefKind = "item" | "move" | "location";

const REF_KINDS: Record<RefKind, (keyof EvolutionMethod)[]> = {
  item: ["item", "heldItem"],
  move: ["knownMove", "usedMove"],
  location: ["location"],
};

/** The items, moves and places named anywhere in the tree, without doubles. */
export function methodRefs(node: EvolutionNode): Record<RefKind, string[]> {
  const found: Record<RefKind, Set<string>> = {
    item: new Set(),
    move: new Set(),
    location: new Set(),
  };
  const visit = (current: EvolutionNode) => {
    for (const method of current.methods) {
      for (const kind of Object.keys(REF_KINDS) as RefKind[]) {
        for (const key of REF_KINDS[kind]) {
          const value = method[key] as NamedRef | undefined;
          if (value) found[kind].add(value.name);
        }
      }
    }
    current.evolvesTo.forEach(visit);
  };
  visit(node);
  return {
    item: [...found.item],
    move: [...found.move],
    location: [...found.location],
  };
}

/** Fills in the names of the items, moves and places of every method. */
export function withMethodNames(
  node: EvolutionNode,
  lookup: (kind: RefKind, name: string) => LocalizedText,
): EvolutionNode {
  const named = (kind: RefKind, value: NamedRef | undefined) =>
    value && { ...value, names: lookup(kind, value.name) };
  return {
    ...node,
    methods: node.methods.map((method) => {
      const result: EvolutionMethod = { ...method };
      for (const kind of Object.keys(REF_KINDS) as RefKind[]) {
        for (const key of REF_KINDS[kind]) {
          const value = named(kind, method[key] as NamedRef | undefined);
          if (value) (result as Record<string, unknown>)[key] = value;
        }
      }
      return result;
    }),
    evolvesTo: node.evolvesTo.map((child) => withMethodNames(child, lookup)),
  };
}

/** Fills in the species names of every stage. */
export function withEvolutionNames(
  node: EvolutionNode,
  namesById: ReadonlyMap<number, LocalizedText>,
  varietiesById: ReadonlyMap<number, Record<string, number>> = new Map(),
): EvolutionNode {
  return {
    ...node,
    names: namesById.get(node.id) ?? {},
    varieties: varietiesById.get(node.id) ?? {},
    evolvesTo: node.evolvesTo.map((child) =>
      withEvolutionNames(child, namesById, varietiesById),
    ),
  };
}
