/** Species ids (national dex numbers) shown in their shiny colours. */
export type ShinyIds = readonly number[];

/** Reads the stored JSON; anything malformed is dropped. */
export function parseShiny(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const ids = value.filter(
      (item): item is number =>
        typeof item === "number" && Number.isInteger(item) && item > 0,
    );
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

export function serializeShiny(ids: ShinyIds): string {
  return JSON.stringify(ids);
}

/** Turns shiny on or off for a species; returns the list itself if nothing changes. */
export function setShiny(ids: ShinyIds, id: number, on: boolean): ShinyIds {
  if (ids.includes(id) === on) return ids;
  return on ? [...ids, id] : ids.filter((other) => other !== id);
}

/** Turns shiny on or off for several species at once. */
export function setShinyMany(
  ids: ShinyIds,
  targets: readonly number[],
  on: boolean,
): ShinyIds {
  return targets.reduce((list, id) => setShiny(list, id, on), ids);
}
