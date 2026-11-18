/**
 * Favorites are stored as keys: "6" for the default form of species 6 and
 * "6:10034" for an alternative form (the pokemon id of that form).
 */
export type FavoriteKey = string;

export function makeFavoriteKey(
  speciesId: number,
  formId: number | null,
  defaultFormId: number | null,
): FavoriteKey {
  return formId === null || formId === defaultFormId
    ? String(speciesId)
    : `${speciesId}:${formId}`;
}

const KEY_PATTERN = /^(\d{1,5})(?::\d{1,6})?$/;

export function speciesIdOf(key: FavoriteKey): number {
  return Number(key.split(":")[0]);
}

/** Reads the stored JSON; anything malformed is dropped. */
export function parseFavorites(raw: string | null): FavoriteKey[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const keys = value.filter(
      (item): item is string =>
        typeof item === "string" && KEY_PATTERN.test(item),
    );
    return [...new Set(keys)];
  } catch {
    return [];
  }
}

export function serializeFavorites(keys: readonly FavoriteKey[]): string {
  return JSON.stringify(keys);
}

/** Species that have at least one favorite form. */
export function favoriteSpeciesIds(keys: readonly FavoriteKey[]): Set<number> {
  return new Set(keys.map(speciesIdOf));
}

export function toggleFavorite(
  keys: readonly FavoriteKey[],
  key: FavoriteKey,
): FavoriteKey[] {
  return keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
}

/**
 * The heart on a card: removes every favorite of the species when there is
 * one, otherwise adds the default form.
 */
export function toggleSpeciesFavorite(
  keys: readonly FavoriteKey[],
  speciesId: number,
): FavoriteKey[] {
  return keys.some((key) => speciesIdOf(key) === speciesId)
    ? keys.filter((key) => speciesIdOf(key) !== speciesId)
    : [...keys, String(speciesId)];
}
