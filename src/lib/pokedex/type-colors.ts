/** Background colours for white text: every colour has at least 4.5:1 contrast. */
const TYPE_COLORS: Record<string, string> = {
  normal: "#77774d",
  fire: "#c84d0a",
  water: "#3472d8",
  electric: "#926e10",
  grass: "#368536",
  ice: "#377f87",
  fighting: "#b03a2e",
  poison: "#9b3fb5",
  ground: "#8c7038",
  flying: "#6372ae",
  psychic: "#cc3f70",
  bug: "#697d16",
  rock: "#837434",
  ghost: "#6b4f96",
  dragon: "#5a3fd9",
  dark: "#5c4a3d",
  steel: "#687586",
  fairy: "#a35f7c",
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? "#68737f";
}

/**
 * A soft background in the colours of a Pokémon's types: the type colour mixed
 * into the surface (how much is `--type-tint`), so the text on it stays
 * readable. One type gives a flat colour, two types a diagonal gradient.
 * Undefined without types.
 */
export function typeBackground(types: readonly string[]): string | undefined {
  const tint = (type: string) =>
    `color-mix(in srgb, ${typeColor(type)} var(--type-tint), var(--surface))`;
  if (types.length === 0) return undefined;
  if (types.length === 1) return tint(types[0]);
  return `linear-gradient(135deg, ${tint(types[0])}, ${tint(types[1])})`;
}
