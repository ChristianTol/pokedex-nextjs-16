import type { LocalizedText } from "@/lib/i18n/languages";
import type { Matchups, TypeChart } from "@/lib/pokedex/matchups";


export type PokemonGender = { male: number; female: number };

export type PokemonAbility = {
  /** Place in the Pokémon's ability list (3 is the hidden ability). */
  slot: number;
  /** PokéAPI slug, e.g. "solar-power". */
  name: string;
  hidden: boolean;
  names: LocalizedText;
  descriptions: LocalizedText;
  /** Full general effect, separate from short and game-specific descriptions. */
  effectDescriptions: LocalizedText;
  /** Ability flavor text per PokéAPI version group. */
  gameDescriptions: Record<string, LocalizedText>;
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
  /** PokéAPI pokemon or pokemon-form id, depending on how the form is stored. */
  id: number;
  /** PokéAPI pokemon slug, e.g. "charizard-mega-x". */
  name: string;
  isDefault: boolean;
};

export type PokemonFormSprites = {
  id: number;
  /** Localized form name from PokéAPI, when its form resource is available. */
  names?: LocalizedText;
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
