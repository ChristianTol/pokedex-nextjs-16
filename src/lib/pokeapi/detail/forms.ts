import { mapWithConcurrency } from "@/lib/async";
import type { LocalizedText } from "@/lib/i18n/languages";
import { PokeApiError, fetchPokeApi, idFromUrl } from "../client";
import { parseLocalizedNames } from "./names";
import type {
  PokemonFormResourceResponse,
  PokemonFormResponse,
  PokemonFormSelection,
  PokemonResponse,
  SpeciesResponse,
} from "./responses";
import { parseFormSprites } from "./sprites";
import type { PokemonForm, PokemonFormSprites } from "./types";

export function parseForms(species: SpeciesResponse): PokemonForm[] {
  return species.varieties.map((variety) => ({
    id: idFromUrl(variety.pokemon.url),
    name: variety.pokemon.name,
    isDefault: variety.is_default,
  }));
}

/**
 * Resolves species varieties and any additional forms exposed by their
 * Pokémon resources. Form resource IDs are kept separate from Pokémon IDs.
 */
export async function resolvePokemonForms(
  species: SpeciesResponse,
): Promise<PokemonFormSelection[]> {
  const varieties = await mapWithConcurrency(
    species.varieties,
    6,
    async (variety) => {
      const pokemonId = idFromUrl(variety.pokemon.url);
      try {
        return {
          variety,
          pokemonId,
          pokemon: await fetchPokeApi<PokemonResponse>(`/pokemon/${pokemonId}`),
        };
      } catch {
        return { variety, pokemonId };
      }
    },
  );

  const groups = await mapWithConcurrency(varieties, 6, async (entry) => {
    const formRefs = entry.pokemon?.forms ?? [];
    if (!entry.pokemon || formRefs.length <= 1) {
      return [
        {
          form: {
            id: entry.pokemonId,
            name: entry.variety.pokemon.name,
            isDefault: entry.variety.is_default,
          },
          pokemonId: entry.pokemonId,
          pokemon: entry.pokemon,
        },
      ];
    }

    const playableForms = formRefs.filter(
      (form) => !(species.id === 493 && form.name === "arceus-unknown"),
    );
    let defaultFormId: number | undefined;
    if (entry.variety.is_default) {
      for (const form of playableForms) {
        try {
          const resource = await fetchPokeApi<PokemonFormResourceResponse>(
            `/pokemon-form/${idFromUrl(form.url)}`,
          );
          if (resource.is_default) {
            defaultFormId = idFromUrl(form.url);
            break;
          }
        } catch {
          // A missing form resource should not hide the other form choices.
        }
      }
      defaultFormId ??=
        playableForms.find((form) => idFromUrl(form.url) === entry.pokemonId)
          ? entry.pokemonId
          : playableForms[0]
            ? idFromUrl(playableForms[0].url)
            : undefined;
    }

    return playableForms.map((form) => {
      const formId = idFromUrl(form.url);
      return {
        form: {
          id: formId,
          name: form.name,
          isDefault: entry.variety.is_default && formId === defaultFormId,
        },
        pokemonId: entry.pokemonId,
        pokemon: entry.pokemon,
        formResourceId: formId,
      };
    });
  });

  const unique = new Map<number, PokemonFormSelection>();
  for (const selection of groups.flat()) {
    if (!unique.has(selection.form.id)) unique.set(selection.form.id, selection);
  }
  const selections = [...unique.values()];
  if (!selections.some((selection) => selection.form.isDefault)) {
    const defaultVariety =
      species.varieties.find((variety) => variety.is_default) ??
      species.varieties[0];
    const defaultVarietyId = defaultVariety
      ? idFromUrl(defaultVariety.pokemon.url)
      : undefined;
    const fallback = defaultVarietyId
      ? selections.find((selection) => selection.form.id === defaultVarietyId) ??
        selections.find((selection) => selection.pokemonId === defaultVarietyId)
      : selections[0];
    if (fallback) {
      fallback.form = { ...fallback.form, isDefault: true };
    }
  }
  return selections;
}

export function parsePokemonFormNames(
  form: PokemonFormResponse,
): LocalizedText {
  return parseLocalizedNames(form.form_names ?? []);
}

/** Fetches the species and validates the selected variety or form resource ID. */
export async function resolveForm(id: number, formId?: number) {
  const species = await fetchPokeApi<SpeciesResponse>(`/pokemon-species/${id}`);
  const selections = await resolvePokemonForms(species);
  const selectedId =
    formId ??
    selections.find((selection) => selection.form.isDefault)?.form.id ??
    id;
  const selected = selections.find(
    (selection) => selection.form.id === selectedId,
  );
  if (!selected) {
    throw new PokeApiError(`Pokémon ${id} has no form ${selectedId}`, 404);
  }
  return {
    species,
    targetId: selected.pokemonId,
    forms: selections.map((selection) => selection.form),
    selected,
  };
}

/** Loads each form's sprites and localized name independently. */
export async function getPokemonFormSprites(
  id: number,
): Promise<PokemonFormSprites[]> {
  const species = await fetchPokeApi<SpeciesResponse>(`/pokemon-species/${id}`);
  const selections = await resolvePokemonForms(species);
  return mapWithConcurrency(selections, 6, async (selection) => {
    const { form } = selection;
    if (selection.formResourceId !== undefined) {
      try {
        const resource = await fetchPokeApi<PokemonFormResourceResponse>(
          `/pokemon-form/${selection.formResourceId}`,
        );
        return {
          ...parseFormSprites(form.id, resource),
          names: parsePokemonFormNames(resource),
        };
      } catch {
        return {
          id: form.id,
          names: {},
          gameSprites: {},
          defaultSprite: null,
          shinyDefaultSprite: null,
          artwork: null,
          shinyArtwork: null,
        };
      }
    }
    try {
      if (!selection.pokemon) throw new Error("Pokémon resource unavailable");
      const pokemon = selection.pokemon;
      const sprites = parseFormSprites(form.id, pokemon);
      const formResource = pokemon.forms?.[0];
      if (!formResource) return { ...sprites, names: {} };
      try {
        const formData = await fetchPokeApi<PokemonFormResponse>(
          `/pokemon-form/${idFromUrl(formResource.url)}`,
        );
        return { ...sprites, names: parsePokemonFormNames(formData) };
      } catch {
        return { ...sprites, names: {} };
      }
    } catch {
      return {
        id: form.id,
        names: {},
        gameSprites: {},
        defaultSprite: null,
        shinyDefaultSprite: null,
        artwork: null,
        shinyArtwork: null,
      };
    }
  });
}
