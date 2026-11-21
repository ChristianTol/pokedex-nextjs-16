import { mapWithConcurrency } from "@/lib/async";
import {
  TEXT_LANGUAGES,
  textLanguageOf,
  type LocalizedText,
  type TextLanguage,
} from "@/lib/i18n/languages";
import { evolutionIds } from "@/lib/pokedex/evolution";
import { versionGroupOf } from "@/lib/pokedex/games";
import {
  computeMatchups,
  type Matchups,
  type TypeChart,
  type TypeRelations,
} from "@/lib/pokedex/matchups";
import { PokeApiError, fetchPokeApi, idFromUrl } from "./client";
import {
  defaultGame,
  parseLearnsets,
  type PokemonMovesResponse,
} from "./learnsets";

export type PokemonGender = { male: number; female: number };

export type PokemonAbility = {
  /** Place in the Pokémon's ability list (3 is the hidden ability). */
  slot: number;
  /** PokéAPI slug, e.g. "solar-power". */
  name: string;
  hidden: boolean;
  names: LocalizedText;
  descriptions: LocalizedText;
};

export type PokemonStat = {
  /** PokéAPI slug, e.g. "special-attack". */
  name: string;
  value: number;
};

/** An item, move or place an evolution asks for, with its names. */
export type NamedRef = { name: string; names: LocalizedText };

/**
 * One way a Pokémon evolves. PokéAPI lists several per step: alternatives,
 * and different ones per game. Only what applies is present.
 */
export type EvolutionMethod = {
  /** The game (version group) this way is for; null when PokéAPI names none. */
  game: string | null;
  /** The way PokéAPI marks as the usual one when a game has none of its own. */
  isDefault: boolean;
  /** Trigger slug, e.g. "level-up", "trade", "use-item". */
  trigger: string;
  level?: number;
  item?: NamedRef;
  heldItem?: NamedRef;
  knownMove?: NamedRef;
  usedMove?: NamedRef;
  location?: NamedRef;
  /** Type slug of a move the Pokémon must know, or of a party member. */
  knownMoveType?: string;
  partyType?: string;
  /** Species slugs. */
  partySpecies?: string;
  tradeSpecies?: string;
  region?: string;
  /** Pokémon slugs of the form that evolves / that it evolves into, e.g. "vulpix-alola". */
  requiredForm?: string;
  evolvedForm?: string;
  /** "day", "night", "dusk" or "full-moon". */
  timeOfDay?: string;
  moveCount?: number;
  happiness?: number;
  affection?: number;
  beauty?: number;
  steps?: number;
  damageTaken?: number;
  /** PokéAPI: 1 is female, 2 is male. */
  gender?: number;
  /** Attack against Defense: 1 higher, -1 lower, 0 equal. */
  statsRelation?: number;
  nearRock?: true;
  rain?: true;
  multiplayer?: true;
  upsideDown?: true;
};

export type EvolutionNode = {
  id: number;
  name: string;
  /** Species names; empty until filled in by `getPokemonDetail`. */
  names: LocalizedText;
  /** The ways the previous stage evolves into this one; empty for the first stage. */
  methods: EvolutionMethod[];
  evolvesTo: EvolutionNode[];
  /** Pokémon slug → pokemon id of the species' forms; filled in by `getPokemonDetail`. */
  varieties?: Record<string, number>;
  /** Pokémon id of the form to show instead of the default, e.g. Alolan Vulpix. */
  formId?: number;
};

export type PokemonForm = {
  /** PokéAPI pokemon id of the form (above 10000 for alternative forms). */
  id: number;
  /** PokéAPI pokemon slug, e.g. "charizard-mega-x". */
  name: string;
  isDefault: boolean;
};

export type PokemonFormSprites = {
  id: number;
  gameSprites: Record<string, GameSprite>;
  defaultSprite: string | null;
  shinyDefaultSprite: string | null;
  artwork: string | null;
  shinyArtwork: string | null;
};

/** Base stats of a generation and earlier: only the stats that differ from later ones. */
export type PastStats = { generation: number; stats: PokemonStat[] };

/** Types up to and including a generation. */
export type PastTypes = { generation: number; types: string[] };

/**
 * Abilities up to and including a generation, only the slots that differed
 * from later ones; `null` means the slot was empty.
 */
export type PastAbilities = {
  generation: number;
  slots: { slot: number; ability: PokemonAbility | null }[];
};

/** The pixel sprite a game shows for a Pokémon. */
export type GameSprite = { front: string; shiny: string | null };

export type PokemonDetail = {
  /** Species id (the national dex number). */
  id: number;
  /** The species slug, e.g. "charizard", also when a form is shown. */
  speciesName: string;
  /** The species name in each language PokéAPI has it in. */
  names: LocalizedText;
  /** Pokédex description per language (the newest game's entry). */
  descriptions: LocalizedText;
  /** Pokédex description per game (version group slug), where PokéAPI has one. */
  gameDescriptions: Record<string, LocalizedText>;
  /** Id of the form these details belong to. */
  pokemonId: number;
  /** Slug of the form, e.g. "charizard-mega-x". */
  name: string;
  forms: PokemonForm[];
  /** Official artwork of this form; null if PokéAPI has none. */
  artwork: string | null;
  /** Artwork of the shiny version of this form; null if PokéAPI has none. */
  shinyArtwork: string | null;
  types: string[];
  heightMeters: number;
  weightKg: number;
  /** The kind of Pokémon per language, e.g. "Mouse Pokémon". */
  genus: LocalizedText;
  /** Pixel sprites by PokéAPI version key (e.g. "red-blue"), where there are any. */
  gameSprites: Record<string, GameSprite>;
  /** Url of the newest cry; null if PokéAPI has none. */
  cry: string | null;
  /** Null for genderless Pokémon. */
  gender: PokemonGender | null;
  abilities: PokemonAbility[];
  stats: PokemonStat[];
  /** Stats as they were in earlier generations, oldest first. */
  pastStats: PastStats[];
  /** Games this form has moves in, newest first; empty without any moves. */
  games: string[];
  /** The game shown first: the newest one with level-up moves. */
  defaultGame: string | null;
  /** Abilities as they were in earlier generations, oldest first. */
  pastAbilities: PastAbilities[];
  /** Types as they were in earlier generations, oldest first. */
  pastTypes: PastTypes[];
  /** Damage relations of this form's types, now and in the past. */
  typeCharts: TypeChart[];
  /** How the types of this form match up against the other types. */
  matchups: Matchups;
  /** Root of the evolution family; the same tree for every member. */
  evolution: EvolutionNode;
};

type PokemonResponse = {
  id: number;
  name: string;
  height: number;
  weight: number;
  cries?: { latest?: string | null; legacy?: string | null };
  types: { slot: number; type: { name: string } }[];
  abilities: {
    slot: number;
    is_hidden: boolean;
    ability: { name: string };
  }[];
  stats: { base_stat: number; stat: { name: string } }[];
  /** Only used for the list of games; the moves themselves load separately. */
  moves?: PokemonMovesResponse["moves"];
  past_stats?: {
    generation: { url: string };
    stats: { base_stat: number; stat: { name: string } }[];
  }[];
  past_abilities?: {
    generation: { url: string };
    abilities: {
      slot: number;
      is_hidden: boolean;
      ability: { name: string } | null;
    }[];
  }[];
  past_types?: {
    generation: { url: string };
    types: { slot: number; type: { name: string } }[];
  }[];
  sprites: {
    front_default: string | null;
    front_shiny?: string | null;
    versions?: Record<
      string,
      Record<
        string,
        { front_default?: string | null; front_shiny?: string | null }
      >
    >;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
        front_shiny?: string | null;
      };
    };
  };
};

type NameEntry = { name: string; language: { name: string } };

type FlavorTextEntry = {
  flavor_text: string;
  language: { name: string };
  version?: { name: string };
};

type SpeciesResponse = {
  id: number;
  name: string;
  names: NameEntry[];
  flavor_text_entries: FlavorTextEntry[];
  gender_rate: number;
  genera: { genus: string; language: { name: string } }[];
  evolution_chain: { url: string };
  varieties: { is_default: boolean; pokemon: { name: string; url: string } }[];
};

type RefResponse = { name: string } | null;

type EvolutionDetailResponse = {
  min_level: number | null;
  item: RefResponse;
  trigger: { name: string };
  version_group?: { name: string } | null;
  is_default?: boolean;
  held_item?: RefResponse;
  known_move?: RefResponse;
  known_move_type?: RefResponse;
  used_move?: RefResponse;
  location?: RefResponse;
  party_type?: RefResponse;
  party_species?: RefResponse;
  trade_species?: RefResponse;
  region?: RefResponse;
  required_pokemon_form?: RefResponse;
  evolved_pokemon_form?: RefResponse;
  time_of_day?: string;
  min_move_count?: number | null;
  min_happiness?: number | null;
  min_affection?: number | null;
  min_beauty?: number | null;
  min_steps?: number | null;
  min_damage_taken?: number | null;
  gender?: number | null;
  relative_physical_stats?: number | null;
  near_special_rock?: boolean;
  needs_overworld_rain?: boolean;
  needs_multiplayer?: boolean;
  turn_upside_down?: boolean;
};

type ChainLinkResponse = {
  species: { name: string; url: string };
  evolution_details: EvolutionDetailResponse[];
  evolves_to: ChainLinkResponse[];
};

type EvolutionChainResponse = { chain: ChainLinkResponse };

type AbilityResponse = {
  names: NameEntry[];
  effect_entries: {
    short_effect: string;
    language: { name: string };
  }[];
  flavor_text_entries: {
    flavor_text: string;
    language: { name: string };
  }[];
};

/** PokéAPI gives the female chance in eighths; -1 means genderless. */
export function parseGender(genderRate: number): PokemonGender | null {
  if (genderRate < 0) return null;
  const female = (genderRate / 8) * 100;
  return { male: 100 - female, female };
}

/** The "kind of Pokémon" text per language, e.g. "Mouse Pokémon". */
export function parseGenera(genera: SpeciesResponse["genera"]): LocalizedText {
  return parseLocalizedNames(
    genera.map((entry) => ({ name: entry.genus, language: entry.language })),
  );
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Keeps the names in the languages we show. Japanese with kanji ("ja") wins
 * over the kana-only version ("ja-hrkt").
 */
export function parseLocalizedNames(names: NameEntry[]): LocalizedText {
  const result: LocalizedText = {};
  for (const entry of names) {
    const language = textLanguageOf(entry.language.name);
    if (!language) continue;
    if (entry.language.name === "ja-hrkt" && result[language]) continue;
    result[language] = entry.name;
  }
  return result;
}

/**
 * Line breaks in flavor texts are layout of the game's screen, not meaning.
 * Japanese has no spaces between words, so there they are simply removed, and
 * the wide spaces the games put between phrases become normal ones.
 */
export function cleanFlavorText(
  text: string,
  language: TextLanguage = "en",
): string {
  const cleaned = text.replace(/\u00ad/g, "");
  if (language === "ja") {
    return cleaned
      .replace(/[\n\f\r]+/g, "")
      .replace(/\u3000/g, " ")
      .replace(/ {2,}/g, " ")
      .trim();
  }
  return cleaned
    .replace(/[\n\f\r]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** The newest Pokédex entry per language (entries are ordered by game). */
export function parseDescriptions(entries: FlavorTextEntry[]): LocalizedText {
  const result: LocalizedText = {};
  // Which entry each text came from, to keep kanji over kana for one game.
  const source: Partial<Record<TextLanguage, FlavorTextEntry>> = {};
  for (const entry of entries) {
    const language = textLanguageOf(entry.language.name);
    if (!language) continue;
    const text = cleanFlavorText(entry.flavor_text, language);
    if (!text) continue;
    const previous = source[language];
    const kanaOfSameGame =
      entry.language.name === "ja-hrkt" &&
      previous?.language.name === "ja" &&
      previous.version?.name === entry.version?.name;
    if (kanaOfSameGame) continue;
    result[language] = text;
    source[language] = entry;
  }
  return result;
}

/**
 * The Pokédex entry per game. Versions of one game (Red and Blue) share a
 * version group; the newest text wins, like in `parseDescriptions`.
 */
export function parseGameDescriptions(
  entries: FlavorTextEntry[],
): Record<string, LocalizedText> {
  const byGame: Record<string, FlavorTextEntry[]> = {};
  for (const entry of entries) {
    const game = entry.version && versionGroupOf(entry.version.name);
    if (game) (byGame[game] ??= []).push(entry);
  }
  return Object.fromEntries(
    Object.entries(byGame)
      .map(([game, list]) => [game, parseDescriptions(list)] as const)
      .filter(([, text]) => Object.keys(text).length > 0),
  );
}

export function parsePastStats(pokemon: PokemonResponse): PastStats[] {
  return (pokemon.past_stats ?? [])
    .map((entry) => ({
      generation: idFromUrl(entry.generation.url),
      stats: entry.stats.map((stat) => ({
        name: stat.stat.name,
        value: stat.base_stat,
      })),
    }))
    .sort((a, b) => a.generation - b.generation);
}

const typeNames = (types: { slot: number; type: { name: string } }[]) =>
  [...types].sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name);

/** Slugs of the types the Pokémon had in earlier generations. */
export function pastTypeNames(pokemon: PokemonResponse): string[] {
  return (pokemon.past_types ?? []).flatMap((entry) => typeNames(entry.types));
}

export function parsePastTypes(pokemon: PokemonResponse): PastTypes[] {
  return (pokemon.past_types ?? [])
    .map((entry) => ({
      generation: idFromUrl(entry.generation.url),
      types: typeNames(entry.types),
    }))
    .sort((a, b) => a.generation - b.generation);
}

/** Slugs of the abilities the Pokémon had in earlier generations. */
export function pastAbilityNames(pokemon: PokemonResponse): string[] {
  return (pokemon.past_abilities ?? []).flatMap((entry) =>
    entry.abilities.flatMap((slot) =>
      slot.ability ? [slot.ability.name] : [],
    ),
  );
}

export function parseTypeChart(relations: TypeRelations): TypeChart {
  return {
    name: relations.name,
    relations: relations.damage_relations,
    past: (relations.past_damage_relations ?? [])
      .map((entry) => ({
        generation: idFromUrl(entry.generation.url),
        relations: entry.damage_relations,
      }))
      .sort((a, b) => a.generation - b.generation),
  };
}

/**
 * Per language: the short effect when PokéAPI has one, otherwise the newest
 * flavor text (newer abilities only have flavor text).
 */
export function parseAbilityTexts(ability: AbilityResponse): {
  names: LocalizedText;
  descriptions: LocalizedText;
} {
  const descriptions: LocalizedText = {};
  for (const language of TEXT_LANGUAGES) {
    const effect = ability.effect_entries.find(
      (entry) => textLanguageOf(entry.language.name) === language,
    );
    const flavor = ability.flavor_text_entries
      .filter((entry) => textLanguageOf(entry.language.name) === language)
      .at(-1);
    const text = effect
      ? cleanText(effect.short_effect)
      : flavor && cleanFlavorText(flavor.flavor_text, language);
    if (text) descriptions[language] = text;
  }
  return { names: parseLocalizedNames(ability.names), descriptions };
}

export function parseForms(species: SpeciesResponse): PokemonForm[] {
  return species.varieties.map((variety) => ({
    id: idFromUrl(variety.pokemon.url),
    name: variety.pokemon.name,
    isDefault: variety.is_default,
  }));
}

export function parseArtwork(pokemon: PokemonResponse): string | null {
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.front_default ??
    null
  );
}

export function parseShinyArtwork(pokemon: PokemonResponse): string | null {
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_shiny ??
    pokemon.sprites.front_shiny ??
    null
  );
}

const KYUREM_SCARLET_VIOLET_SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/";

function correctKyuremScarletVioletSprite(
  id: number,
  game: string,
  url: string,
): string {
  if (game !== "scarlet-violet" || (id !== 10022 && id !== 10023)) return url;

  const otherId = id === 10022 ? 10023 : 10022;
  const normalSprite = `${KYUREM_SCARLET_VIOLET_SPRITE_BASE}${id}.webp`;
  if (url === normalSprite) {
    return `${KYUREM_SCARLET_VIOLET_SPRITE_BASE}${otherId}.webp`;
  }

  const shinySprite = `${KYUREM_SCARLET_VIOLET_SPRITE_BASE}shiny/${id}.webp`;
  if (url === shinySprite) {
    return `${KYUREM_SCARLET_VIOLET_SPRITE_BASE}shiny/${otherId}.webp`;
  }
  return url;
}

/**
 * The front sprite per game, by the version key PokéAPI uses (it is spread
 * over generations). The menu "icons" are not game sprites.
 */
export function parseGameSprites(
  pokemon: PokemonResponse,
): Record<string, GameSprite> {
  const result: Record<string, GameSprite> = {};
  for (const generation of Object.values(pokemon.sprites.versions ?? {})) {
    for (const [key, sprite] of Object.entries(generation)) {
      if (key === "icons" || !sprite.front_default) continue;
      result[key] = {
        front: correctKyuremScarletVioletSprite(
          pokemon.id,
          key,
          sprite.front_default,
        ),
        shiny: sprite.front_shiny
          ? correctKyuremScarletVioletSprite(
              pokemon.id,
              key,
              sprite.front_shiny,
            )
          : null,
      };
    }
  }
  return result;
}

export function parseFormSprites(
  id: number,
  pokemon: PokemonResponse,
): PokemonFormSprites {
  return {
    id,
    gameSprites: parseGameSprites(pokemon),
    defaultSprite: pokemon.sprites.front_default,
    shinyDefaultSprite: pokemon.sprites.front_shiny ?? null,
    artwork: pokemon.sprites.other?.["official-artwork"]?.front_default ?? null,
    shinyArtwork:
      pokemon.sprites.other?.["official-artwork"]?.front_shiny ?? null,
  };
}

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

type AbilityTexts = Record<
  string,
  { names: LocalizedText; descriptions: LocalizedText }
>;

function parseAbility(
  slot: number,
  hidden: boolean,
  name: string,
  texts: AbilityTexts,
): PokemonAbility {
  return {
    slot,
    name,
    hidden,
    names: texts[name]?.names ?? {},
    descriptions: texts[name]?.descriptions ?? {},
  };
}

export function parsePastAbilities(
  pokemon: PokemonResponse,
  texts: AbilityTexts,
): PastAbilities[] {
  return (pokemon.past_abilities ?? [])
    .map((entry) => ({
      generation: idFromUrl(entry.generation.url),
      slots: entry.abilities.map((slot) => ({
        slot: slot.slot,
        ability: slot.ability
          ? parseAbility(slot.slot, slot.is_hidden, slot.ability.name, texts)
          : null,
      })),
    }))
    .sort((a, b) => a.generation - b.generation);
}

const REF_CONCURRENCY = 10;

/**
 * The names of the items, moves and places of an evolution tree. A name that
 * cannot be loaded is left out (the screen then shows the slug).
 */
async function fetchRefNames(
  refs: Record<RefKind, string[]>,
): Promise<Map<string, LocalizedText>> {
  const wanted = (Object.keys(refs) as RefKind[]).flatMap((kind) =>
    refs[kind].map((name) => ({ kind, name })),
  );
  const loaded = await mapWithConcurrency(
    wanted,
    REF_CONCURRENCY,
    async (ref) => {
      try {
        const response = await fetchPokeApi<{ names: NameEntry[] }>(
          `/${ref.kind}/${ref.name}`,
        );
        return [
          `${ref.kind}:${ref.name}`,
          parseLocalizedNames(response.names),
        ] as const;
      } catch {
        return [`${ref.kind}:${ref.name}`, {}] as const;
      }
    },
  );
  return new Map(loaded);
}

export function parseDetail(
  pokemon: PokemonResponse,
  species: SpeciesResponse,
  abilityTexts: AbilityTexts,
  evolution: EvolutionNode,
  typeRelations: TypeRelations[],
  olderTypeRelations: TypeRelations[] = [],
): PokemonDetail {
  const learnsets = parseLearnsets({ moves: pokemon.moves ?? [] });
  return {
    id: species.id,
    speciesName: species.name,
    names: parseLocalizedNames(species.names),
    descriptions: parseDescriptions(species.flavor_text_entries),
    gameDescriptions: parseGameDescriptions(species.flavor_text_entries),
    pokemonId: pokemon.id,
    name: pokemon.name,
    forms: parseForms(species),
    artwork: parseArtwork(pokemon),
    shinyArtwork: parseShinyArtwork(pokemon),
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type.name),
    heightMeters: pokemon.height / 10,
    weightKg: pokemon.weight / 10,
    genus: parseGenera(species.genera),
    gameSprites: parseGameSprites(pokemon),
    cry: pokemon.cries?.latest ?? pokemon.cries?.legacy ?? null,
    gender: parseGender(species.gender_rate),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) =>
        parseAbility(
          entry.slot,
          entry.is_hidden,
          entry.ability.name,
          abilityTexts,
        ),
      ),
    stats: pokemon.stats.map((entry) => ({
      name: entry.stat.name,
      value: entry.base_stat,
    })),
    games: learnsets.map((learnset) => learnset.game),
    defaultGame: defaultGame(learnsets),
    pastStats: parsePastStats(pokemon),
    pastAbilities: parsePastAbilities(pokemon, abilityTexts),
    pastTypes: parsePastTypes(pokemon),
    typeCharts: [...typeRelations, ...olderTypeRelations].map(parseTypeChart),
    matchups: computeMatchups(typeRelations),
    evolution,
  };
}

/**
 * Fetches the species and picks the pokemon to show: `formId` (a pokemon id
 * from the species' varieties) or else the default form. Throws a 404
 * `PokeApiError` for a form that belongs to another species.
 */
export async function resolveForm(id: number, formId?: number) {
  const species = await fetchPokeApi<SpeciesResponse>(`/pokemon-species/${id}`);
  const forms = parseForms(species);
  const targetId = formId ?? forms.find((form) => form.isDefault)?.id ?? id;
  if (!forms.some((form) => form.id === targetId)) {
    throw new PokeApiError(`Pokémon ${id} has no form ${targetId}`, 404);
  }
  return { species, targetId };
}

/** Loads each variety's sprites independently so one missing form is harmless. */
export async function getPokemonFormSprites(
  id: number,
): Promise<PokemonFormSprites[]> {
  const { species } = await resolveForm(id);
  const forms = parseForms(species);
  return mapWithConcurrency(forms, 6, async (form) => {
    try {
      const pokemon = await fetchPokeApi<PokemonResponse>(`/pokemon/${form.id}`);
      return parseFormSprites(form.id, pokemon);
    } catch {
      return {
        id: form.id,
        gameSprites: {},
        defaultSprite: null,
        shinyDefaultSprite: null,
        artwork: null,
        shinyArtwork: null,
      };
    }
  });
}

/** Loads just the requested Pokémon sprites for evolution-chain cards. */
export async function getPokemonSprites(
  ids: readonly number[],
): Promise<PokemonFormSprites[]> {
  return mapWithConcurrency(ids, 6, async (id) => {
    try {
      const pokemon = await fetchPokeApi<PokemonResponse>(`/pokemon/${id}`);
      return parseFormSprites(id, pokemon);
    } catch {
      return {
        id,
        gameSprites: {},
        defaultSprite: null,
        shinyDefaultSprite: null,
        artwork: null,
        shinyArtwork: null,
      };
    }
  });
}

/** Details of a species; `formId` selects an alternative form. */
export async function getPokemonDetail(
  id: number,
  formId?: number,
): Promise<PokemonDetail> {
  const { species, targetId } = await resolveForm(id, formId);

  const [pokemon, chain] = await Promise.all([
    fetchPokeApi<PokemonResponse>(`/pokemon/${targetId}`),
    fetchPokeApi<EvolutionChainResponse>(
      `/evolution-chain/${idFromUrl(species.evolution_chain.url)}`,
    ),
  ]);

  const abilityNames = [
    ...new Set([
      ...pokemon.abilities.map((entry) => entry.ability.name),
      ...pastAbilityNames(pokemon),
    ]),
  ];
  const evolution = parseEvolution(chain.chain);

  // The chain only has slugs; the stages' names come from their species.
  const otherIds = evolutionIds(evolution).filter((stage) => stage !== id);
  const currentTypes = pokemon.types.map((entry) => entry.type.name);
  const olderTypes = [...new Set(pastTypeNames(pokemon))].filter(
    (name) => !currentTypes.includes(name),
  );
  const [abilities, otherSpecies, typeRelations, olderTypeRelations, refNames] =
    await Promise.all([
      Promise.all(
        abilityNames.map(async (name) =>
          parseAbilityTexts(
            await fetchPokeApi<AbilityResponse>(`/ability/${name}`),
          ),
        ),
      ),
      Promise.all(
        otherIds.map((stage) =>
          fetchPokeApi<SpeciesResponse>(`/pokemon-species/${stage}`),
        ),
      ),
      Promise.all(
        pokemon.types.map((entry) =>
          fetchPokeApi<TypeRelations>(`/type/${entry.type.name}`),
        ),
      ),
      Promise.all(
        olderTypes.map((name) => fetchPokeApi<TypeRelations>(`/type/${name}`)),
      ),
      fetchRefNames(methodRefs(evolution)),
    ]);

  const namesById = new Map<number, LocalizedText>(
    [species, ...otherSpecies].map((entry) => [
      entry.id,
      parseLocalizedNames(entry.names),
    ]),
  );

  const varietiesById = new Map<number, Record<string, number>>(
    [species, ...otherSpecies].map((entry) => [
      entry.id,
      Object.fromEntries(
        entry.varieties.map((variety) => [
          variety.pokemon.name,
          idFromUrl(variety.pokemon.url),
        ]),
      ),
    ]),
  );

  return parseDetail(
    pokemon,
    species,
    Object.fromEntries(abilityNames.map((name, i) => [name, abilities[i]])),
    withMethodNames(
      withEvolutionNames(evolution, namesById, varietiesById),
      (kind, name) => refNames.get(`${kind}:${name}`) ?? {},
    ),
    typeRelations,
    olderTypeRelations,
  );
}
