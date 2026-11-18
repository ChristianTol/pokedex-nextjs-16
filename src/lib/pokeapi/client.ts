import { cacheLife } from "next/cache";

const BASE_URL = "https://pokeapi.co/api/v2";

export class PokeApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PokeApiError";
  }
}

export async function fetchPokeApi<T>(path: string): Promise<T> {
  "use cache";
  cacheLife("days");

  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new PokeApiError(
      `PokéAPI request failed: ${path} (${response.status})`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

/** Extracts the numeric id from a PokéAPI resource url, e.g. ".../pokemon/25/". */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) {
    throw new PokeApiError(`Cannot read id from url: ${url}`);
  }
  return Number(match[1]);
}
