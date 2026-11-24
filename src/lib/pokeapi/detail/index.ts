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
  type TypeChart,
  type TypeRelations,
} from "@/lib/pokedex/matchups";
import { fetchPokeApi, idFromUrl } from "../client";
import {
  defaultGame,
  parseLearnsets,
} from "../learnsets";
import type {
  PokemonGender,
  PokemonAbility,
  EvolutionNode,
  PokemonForm,
  PokemonFormSprites,
  PastStats,
  PastTypes,
  PastAbilities,
  PokemonDetail,
} from "./types";
import type {
  PokemonResponse,
  NameEntry,
  PokemonFormResourceResponse,
  FlavorTextEntry,
  SpeciesResponse,
  EvolutionChainResponse,
  AbilityResponse,
} from "./responses";
import {
  parseEvolution,
  methodRefs,
  withEvolutionNames,
  withMethodNames,
  type RefKind,
} from "./evolution";
import {
  parseArtwork,
  parseFormSprites,
  parseGameSprites,
  parseShinyArtwork,
} from "./sprites";
import { resolveForm, parseForms } from "./forms";
import { parseLocalizedNames } from "./names";

export type {
  PokemonGender,
  PokemonAbility,
  PokemonStat,
  NamedRef,
  EvolutionMethod,
  EvolutionNode,
  PokemonForm,
  PokemonFormSprites,
  PastStats,
  PastTypes,
  PastAbilities,
  GameSprite,
  PokemonDetail,
} from "./types";
export {
  parseEvolutionMethod,
  parseEvolution,
  methodRefs,
  withEvolutionNames,
  withMethodNames,
  type RefKind,
} from "./evolution";
export { getPokemonFormSprites, parseForms, parsePokemonFormNames, resolveForm } from "./forms";
export { parseLocalizedNames } from "./names";
export {
  parseArtwork,
  parseFormSprites,
  parseGameSprites,
  parseShinyArtwork,
} from "./sprites";

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

function cleanEffectText(text: string): string {
  return text
    .replace(/\u00ad/g, "")
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
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
 * flavor text (newer abilities only have flavor text), plus the full effect.
 */
export function parseAbilityTexts(ability: AbilityResponse): {
  names: LocalizedText;
  descriptions: LocalizedText;
  effectDescriptions: LocalizedText;
  gameDescriptions: Record<string, LocalizedText>;
} {
  const descriptions: LocalizedText = {};
  const effectDescriptions: LocalizedText = {};
  for (const language of TEXT_LANGUAGES) {
    const effect = ability.effect_entries.find(
      (entry) => textLanguageOf(entry.language.name) === language,
    );
    const fullEffect = effect && cleanEffectText(effect.effect);
    if (fullEffect) effectDescriptions[language] = fullEffect;
    const flavor = ability.flavor_text_entries
      .filter((entry) => textLanguageOf(entry.language.name) === language)
      .at(-1);
    const text = effect
      ? cleanText(effect.short_effect)
      : flavor && cleanFlavorText(flavor.flavor_text, language);
    if (text) descriptions[language] = text;
  }
  const byGame: Record<string, FlavorTextEntry[]> = {};
  for (const entry of ability.flavor_text_entries) {
    const game = entry.version_group?.name;
    if (!game) continue;
    (byGame[game] ??= []).push({
      flavor_text: entry.flavor_text,
      language: entry.language,
      version: { name: game },
    });
  }
  const gameDescriptions = Object.fromEntries(
    Object.entries(byGame)
      .map(([game, entries]) => [game, parseDescriptions(entries)] as const)
      .filter(([, text]) => Object.keys(text).length > 0),
  );

  return {
    names: parseLocalizedNames(ability.names),
    descriptions,
    effectDescriptions,
    gameDescriptions,
  };
}

function arceusPastTypes(types: string[]): PastTypes[] {
  const past: PastTypes[] = [{ generation: 3, types: ["normal"] }];
  if (types.includes("fairy")) past.push({ generation: 5, types: ["normal"] });
  return past;
}

type AbilityTexts = Record<
  string,
  {
    names: LocalizedText;
    descriptions: LocalizedText;
    effectDescriptions: LocalizedText;
    gameDescriptions: Record<string, LocalizedText>;
  }
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
    effectDescriptions: texts[name]?.effectDescriptions ?? {},
    gameDescriptions: texts[name]?.gameDescriptions ?? {},
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
  forms: PokemonForm[] = parseForms(species),
  selectedForm?: PokemonFormResourceResponse,
): PokemonDetail {
  const learnsets = parseLearnsets({ moves: pokemon.moves ?? [] });
  const formPokemon = selectedForm
    ? {
        ...pokemon,
        name: selectedForm.name,
        types: selectedForm.types,
        sprites: selectedForm.sprites,
      }
    : pokemon;
  const currentTypes = typeNames(formPokemon.types);
  return {
    id: species.id,
    speciesName: species.name,
    names: parseLocalizedNames(species.names),
    descriptions: parseDescriptions(species.flavor_text_entries),
    gameDescriptions: parseGameDescriptions(species.flavor_text_entries),
    pokemonId: pokemon.id,
    name: formPokemon.name,
    forms,
    artwork: parseArtwork(formPokemon),
    shinyArtwork: parseShinyArtwork(formPokemon),
    types: currentTypes,
    heightMeters: pokemon.height / 10,
    weightKg: pokemon.weight / 10,
    genus: parseGenera(species.genera),
    gameSprites: parseGameSprites(formPokemon),
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
    pastTypes:
      selectedForm && species.id === 493
        ? arceusPastTypes(currentTypes)
        : parsePastTypes(pokemon),
    typeCharts: [...typeRelations, ...olderTypeRelations].map(parseTypeChart),
    matchups: computeMatchups(typeRelations),
    evolution,
  };
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
  const { species, targetId, forms, selected } = await resolveForm(id, formId);

  const [chain, selectedForm] = await Promise.all([
    fetchPokeApi<EvolutionChainResponse>(
      `/evolution-chain/${idFromUrl(species.evolution_chain.url)}`,
    ),
    selected.formResourceId === undefined
      ? Promise.resolve(undefined)
      : fetchPokeApi<PokemonFormResourceResponse>(
          `/pokemon-form/${selected.formResourceId}`,
        ).catch(() => undefined),
  ]);
  const pokemonId = selectedForm
    ? idFromUrl(selectedForm.pokemon.url)
    : targetId;
  const pokemon =
    selected.pokemon?.id === pokemonId
      ? selected.pokemon
      : await fetchPokeApi<PokemonResponse>(`/pokemon/${pokemonId}`);

  const abilityNames = [
    ...new Set([
      ...pokemon.abilities.map((entry) => entry.ability.name),
      ...pastAbilityNames(pokemon),
    ]),
  ];
  const evolution = parseEvolution(chain.chain);

  // The chain only has slugs; the stages' names come from their species.
  const otherIds = evolutionIds(evolution).filter((stage) => stage !== id);
  const currentTypes = selectedForm
    ? typeNames(selectedForm.types)
    : pokemon.types.map((entry) => entry.type.name);
  const pastTypes =
    selectedForm && species.id === 493
      ? arceusPastTypes(currentTypes)
      : parsePastTypes(pokemon);
  const olderTypes = [
    ...new Set(pastTypes.flatMap((entry) => entry.types)),
  ].filter((name) => !currentTypes.includes(name));
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
        currentTypes.map((name) => fetchPokeApi<TypeRelations>(`/type/${name}`)),
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
    forms,
    selectedForm,
  );
}
