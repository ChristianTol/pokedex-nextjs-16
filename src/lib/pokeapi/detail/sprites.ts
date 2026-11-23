import type {
  GameSprite,
  PokemonFormSprites,
} from "./types";
import type {
  PokemonResponse,
} from "./responses";

export function parseArtwork(
  pokemon: Pick<PokemonResponse, "name" | "sprites">,
): string | null {
  if (pokemon.name.startsWith("unown-")) {
    return (
      pokemon.sprites.other?.home?.front_default ??
      pokemon.sprites.front_default ??
      null
    );
  }
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.front_default ??
    null
  );
}

export function parseShinyArtwork(
  pokemon: Pick<PokemonResponse, "name" | "sprites">,
): string | null {
  if (pokemon.name.startsWith("unown-")) {
    return (
      pokemon.sprites.other?.home?.front_shiny ??
      pokemon.sprites.front_shiny ??
      null
    );
  }
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_shiny ??
    pokemon.sprites.front_shiny ??
    null
  );
}

// PokéAPI has the Black and White Kyurem sprites swapped in Scarlet/Violet
// (Black = 10022, White = 10023). Remove once the upstream sprites are fixed.
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
  pokemon: Pick<PokemonResponse, "id" | "sprites">,
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
  pokemon: Pick<PokemonResponse, "name" | "sprites">,
): PokemonFormSprites {
  return {
    id,
    gameSprites: parseGameSprites({ id, sprites: pokemon.sprites }),
    defaultSprite: pokemon.sprites.front_default,
    shinyDefaultSprite: pokemon.sprites.front_shiny ?? null,
    artwork: parseArtwork(pokemon),
    shinyArtwork: parseShinyArtwork(pokemon),
  };
}
