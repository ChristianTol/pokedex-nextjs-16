import { describe, expect, it } from "vitest";
import type { EvolutionMethod, EvolutionNode } from "@/lib/pokeapi/detail";
import {
  evolutionIds,
  evolutionItems,
  itemSpriteUrl,
  evolutionLabel,
  evolutionLabels,
  methodsForGame,
  type LabelContext,
} from "@/lib/pokedex/evolution";

const node = (id: number, evolvesTo: EvolutionNode[] = []): EvolutionNode => ({
  id,
  name: `pokemon-${id}`,
  names: {},
  methods: [],
  evolvesTo,
});

describe("evolutionIds", () => {
  it("lists every stage, including branches", () => {
    expect(evolutionIds(node(133, [node(134), node(135)]))).toEqual([
      133, 134, 135,
    ]);
  });

  it("follows a chain to its end", () => {
    expect(evolutionIds(node(1, [node(2, [node(3)])]))).toEqual([1, 2, 3]);
  });

  it("is just the species for one that does not evolve", () => {
    expect(evolutionIds(node(132))).toEqual([132]);
  });
});

const method = (extra: Partial<EvolutionMethod> = {}): EvolutionMethod => ({
  game: null,
  isDefault: false,
  trigger: "level-up",
  ...extra,
});

describe("methodsForGame", () => {
  const leafeon = [
    method({
      game: "diamond-pearl",
      location: { name: "eterna-forest", names: {} },
    }),
    method({
      game: "black-white",
      location: { name: "pinwheel-forest", names: {} },
    }),
    method({ game: "sword-shield", isDefault: true, trigger: "use-item" }),
  ];

  it("keeps a single way as it is", () => {
    const only = [method({ level: 16 })];
    expect(methodsForGame(only, "red-blue")).toEqual(only);
  });

  it("prefers the way made for exactly this game", () => {
    expect(methodsForGame(leafeon, "black-white")).toEqual([leafeon[1]]);
  });

  it("falls back to the usual way for other games", () => {
    expect(methodsForGame(leafeon, "scarlet-violet")).toEqual([leafeon[2]]);
    expect(methodsForGame(leafeon, null)).toEqual([leafeon[2]]);
  });

  it("uses an expansion's main game", () => {
    expect(methodsForGame(leafeon, "the-isle-of-armor")).toEqual([leafeon[2]]);
  });

  it("uses the way of the closest older game when the usual one is newer", () => {
    // Platinum has none of its own; Sword/Shield (the usual one) came later.
    expect(methodsForGame(leafeon, "platinum")).toEqual([leafeon[0]]);
    // Black 2 / White 2 sits after Black / White.
    expect(methodsForGame(leafeon, "black-2-white-2")).toEqual([leafeon[1]]);
  });

  it("uses the usual way for a game that came after it", () => {
    expect(methodsForGame(leafeon, "legends-arceus")).toEqual([leafeon[2]]);
    expect(methodsForGame(leafeon, "some-new-game")).toEqual([leafeon[2]]);
  });

  it("handles Sylveon: Sun/Moon follows X/Y, not Sword/Shield", () => {
    const sylveon = [
      method({ game: "x-y", affection: 2 }),
      method({ game: "sword-shield", isDefault: true, happiness: 160 }),
    ];
    expect(methodsForGame(sylveon, "sun-moon")).toEqual([sylveon[0]]);
    expect(methodsForGame(sylveon, "scarlet-violet")).toEqual([sylveon[1]]);
  });

  it("keeps every way when nothing is exact, usual or older", () => {
    const none = leafeon.map((entry) => ({ ...entry, isDefault: false }));
    expect(methodsForGame(none, "red-blue")).toEqual(none);
  });

  it("takes the closest older way when no way is the usual one", () => {
    const none = leafeon.map((entry) => ({ ...entry, isDefault: false }));
    expect(methodsForGame(none, "scarlet-violet")).toEqual([none[2]]);
  });
});

describe("evolutionLabel", () => {
  const messages: Record<string, string> = {
    "evolution.level": "Lv.",
    "evolution.trade": "Trade",
    "evo.levelUp": "Level up",
    "evo.happiness": "Happiness ≥ {n}",
    "evo.day": "Daytime",
    "evo.night": "At night",
    "evo.knows": "Knows {move}",
    "evo.location": "At {place}",
    "evo.holding": "Holding {item}",
    "evo.knowsType": "Knows a {type}-type move",
    "evo.nearRock": "Near a special rock",
    "evo.useMove": "Use {move} {n} times",
    "evo.attackHigher": "Attack higher than Defense",
    "evo.statsEqual": "Attack equal to Defense",
    "evo.shed": "Free party slot + Poké Ball",
    "evo.region": "In {region}",
    "evo.tradeFor": "Trade for {species}",
    "detail.female": "Female",
    "detail.male": "Male",
    "type.fairy": "Fairy",
    "region.hisui": "Hisui",
  };
  const context = {
    t: (key: string) => messages[key] ?? key,
    tOptional: (key: string) => messages[key] ?? null,
    language: "en" as const,
  } as unknown as LabelContext;
  const ref = (name: string, ja?: string) => ({
    name,
    names: ja ? { en: name, ja } : {},
  });

  it("shows a level", () => {
    expect(evolutionLabel(method({ level: 16 }), context)).toBe("Lv. 16");
  });

  it("combines happiness and time of day, like Espeon and Umbreon", () => {
    expect(
      evolutionLabel(method({ happiness: 160, timeOfDay: "day" }), context),
    ).toBe("Level up · Daytime · Happiness ≥ 160");
    expect(
      evolutionLabel(method({ happiness: 160, timeOfDay: "night" }), context),
    ).toBe("Level up · At night · Happiness ≥ 160");
  });

  it("shows the move a Pokémon must know, like Mamoswine", () => {
    expect(
      evolutionLabel(method({ knownMove: ref("ancient-power") }), context),
    ).toBe("Level up · Knows Ancient Power");
  });

  it("uses the translated name of a move, item or place", () => {
    const japanese = { ...context, language: "ja" } as unknown as LabelContext;
    expect(
      evolutionLabel(
        method({ knownMove: ref("ancient-power", "げんしのちから") }),
        japanese,
      ).endsWith("Knows げんしのちから"),
    ).toBe(true);
  });

  it("describes Sylveon's Fairy move and Leafeon's rock", () => {
    expect(
      evolutionLabel(
        method({ knownMoveType: "fairy", happiness: 160 }),
        context,
      ),
    ).toBe("Level up · Happiness ≥ 160 · Knows a Fairy-type move");
    expect(
      evolutionLabel(
        method({ location: ref("eterna-forest"), nearRock: true }),
        context,
      ),
    ).toBe("Level up · At Eterna Forest · Near a special rock");
  });

  it("names the item of an evolution stone", () => {
    expect(
      evolutionLabel(
        method({ trigger: "use-item", item: ref("fire-stone") }),
        context,
      ),
    ).toBe("Fire Stone");
  });

  it("covers trade, gender, region and stats", () => {
    expect(
      evolutionLabel(
        method({ trigger: "trade", tradeSpecies: "karrablast" }),
        context,
      ),
    ).toBe("Trade · Trade for Karrablast");
    expect(evolutionLabel(method({ level: 32, gender: 1 }), context)).toBe(
      "Lv. 32 · Female",
    );
    expect(
      evolutionLabel(method({ level: 20, region: "hisui" }), context),
    ).toBe("Lv. 20 · In Hisui");
    expect(evolutionLabel(method({ statsRelation: 1 }), context)).toBe(
      "Level up · Attack higher than Defense",
    );
    expect(evolutionLabel(method({ statsRelation: 0 }), context)).toBe(
      "Level up · Attack equal to Defense",
    );
  });

  it("covers the special triggers", () => {
    expect(evolutionLabel(method({ trigger: "shed" }), context)).toBe(
      "Free party slot + Poké Ball",
    );
    expect(
      evolutionLabel(
        method({
          trigger: "use-move",
          usedMove: ref("rage-fist"),
          moveCount: 20,
        }),
        context,
      ),
    ).toBe("Use Rage Fist 20 times");
  });

  it("never gives an empty label", () => {
    expect(
      evolutionLabel(method({ trigger: "some-new-trigger" }), context),
    ).toBe("Some New Trigger");
  });
});

describe("evolutionLabels", () => {
  const context = {
    t: (key: string) => key,
    tOptional: () => null,
    language: "en" as const,
  } as unknown as LabelContext;

  it("drops identical labels", () => {
    const same = [method({ level: 30 }), method({ level: 30 })];
    expect(evolutionLabels(same, null, context)).toEqual([
      "evolution.level 30",
    ]);
  });
});

describe("evolutionItems", () => {
  it("lists the stone and the held item, without doubles", () => {
    const stone = { name: "moon-stone", names: {} };
    const held = { name: "oval-stone", names: {} };
    expect(
      evolutionItems(
        [
          method({ trigger: "use-item", item: stone, isDefault: true }),
          method({ heldItem: held, isDefault: true }),
          method({ trigger: "use-item", item: stone, isDefault: true }),
        ],
        null,
      ),
    ).toEqual(["moon-stone", "oval-stone"]);
  });

  it("is empty for a way without items", () => {
    expect(evolutionItems([method({ level: 16 })], null)).toEqual([]);
  });

  it("points at the PokéAPI item sprite", () => {
    expect(itemSpriteUrl("moon-stone")).toMatch(/\/sprites\/items\/moon-stone\.png$/);
  });
});
