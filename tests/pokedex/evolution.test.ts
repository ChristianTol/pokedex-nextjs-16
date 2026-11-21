import { describe, expect, it } from "vitest";
import type { EvolutionMethod, EvolutionNode } from "@/lib/pokeapi/detail";
import {
  evolutionForForm,
  evolutionIds,
  evolutionSpriteIds,
  regionOf,
  evolutionSteps,
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

describe("evolutionSpriteIds", () => {
  it("uses regional form ids and deduplicates selected forms across branches", () => {
    const root = node(37, [
      { ...node(38), formId: 10009 },
      { ...node(38), formId: 10009 },
      node(39),
    ]);

    expect(evolutionSpriteIds(root)).toEqual([37, 10009, 39]);
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

describe("evolutionSteps", () => {
  const context = {
    t: (key: string) => key,
    tOptional: () => null,
    language: "en" as const,
  } as unknown as LabelContext;
  const stone = (name: string) => ({ name, names: {} });

  it("keeps each way together with its own item", () => {
    expect(
      evolutionSteps(
        [
          method({ trigger: "use-item", item: stone("ice-stone"), isDefault: true }),
          method({ trigger: "use-item", item: stone("fire-stone"), isDefault: true }),
        ],
        null,
        context,
      ),
    ).toEqual([
      { label: "Ice Stone", items: ["ice-stone"] },
      { label: "Fire Stone", items: ["fire-stone"] },
    ]);
  });

  it("lists the stone and the held item of one way, without doubles", () => {
    const steps = evolutionSteps(
      [
        method({ item: stone("moon-stone"), trigger: "use-item", isDefault: true }),
        method({ item: stone("moon-stone"), trigger: "use-item", isDefault: true }),
        method({
          trigger: "trade",
          heldItem: stone("metal-coat"),
          isDefault: true,
        }),
      ],
      null,
      context,
    );
    expect(steps.map((step) => step.items)).toEqual([
      ["moon-stone"],
      ["metal-coat"],
    ]);
  });

  it("has no items for a way without them", () => {
    expect(evolutionSteps([method({ level: 16 })], null, context)).toEqual([
      { label: "evolution.level 16", items: [] },
    ]);
  });
});

describe("itemSpriteUrl", () => {
  it("points at the PokéAPI item sprite", () => {
    expect(itemSpriteUrl("moon-stone")).toMatch(/\/sprites\/items\/moon-stone\.png$/);
  });
});

describe("regionOf", () => {
  it("recognises regional forms only", () => {
    expect(regionOf("ninetales-alola")).toBe("alola");
    expect(regionOf("darmanitan-galar-standard")).toBe("galar");
    expect(regionOf("growlithe-hisui")).toBe("hisui");
    expect(regionOf("ninetales")).toBeNull();
    expect(regionOf("vivillon-polar")).toBeNull();
    expect(regionOf(undefined)).toBeNull();
  });
});

describe("evolutionForForm", () => {
  const stone = (name: string) => ({ name, names: {} });
  const vulpix = (): EvolutionNode => ({
    id: 37,
    name: "vulpix",
    names: {},
    methods: [],
    varieties: { vulpix: 37, "vulpix-alola": 10103 },
    evolvesTo: [
      {
        id: 38,
        name: "ninetales",
        names: {},
        varieties: { ninetales: 38, "ninetales-alola": 10104 },
        methods: [
          method({ trigger: "use-item", item: stone("fire-stone") }),
          method({
            trigger: "use-item",
            item: stone("ice-stone"),
            requiredForm: "vulpix-alola",
            evolvedForm: "ninetales-alola",
          }),
        ],
        evolvesTo: [],
      },
    ],
  });
  const stones = (root: EvolutionNode) =>
    root.evolvesTo[0].methods.map((m) => m.item?.name);

  it("keeps the Fire Stone way for the ordinary form", () => {
    const root = evolutionForForm(vulpix(), "ninetales", 38);
    expect(stones(root)).toEqual(["fire-stone"]);
    expect(root.formId).toBeUndefined();
    expect(root.evolvesTo[0].formId).toBeUndefined();
  });

  it("keeps the Ice Stone way and the Alolan forms for the Alolan one", () => {
    const root = evolutionForForm(vulpix(), "ninetales-alola", 38);
    expect(stones(root)).toEqual(["ice-stone"]);
    expect(root.formId).toBe(10103);
    expect(root.evolvesTo[0].formId).toBe(10104);
  });

  it("keeps every way when none fits the form on screen", () => {
    const root = vulpix();
    root.evolvesTo[0].methods = [
      method({ trigger: "level-up", level: 16, requiredForm: "x-alola" }),
    ];
    expect(evolutionForForm(root, "ninetales", 38).evolvesTo[0].methods).toHaveLength(1);
  });
});

describe("evolutionForForm with branches per region", () => {
  const node = (
    id: number,
    name: string,
    methods: EvolutionMethod[] = [],
    evolvesTo: EvolutionNode[] = [],
    varieties: Record<string, number> = {},
  ): EvolutionNode => ({ id, name, names: {}, methods, evolvesTo, varieties });
  const names = (root: EvolutionNode) => root.evolvesTo.map((c) => c.name);

  const wooper = () =>
    node(
      194,
      "wooper",
      [],
      [
        node(195, "quagsire", [method({ level: 20 })]),
        node(980, "clodsire", [
          method({ level: 20, requiredForm: "wooper-paldea" }),
        ]),
      ],
      { wooper: 194, "wooper-paldea": 10253 },
    );

  it("lets ordinary Wooper evolve only into Quagsire", () => {
    const root = evolutionForForm(wooper(), "wooper", 194);
    expect(names(root)).toEqual(["quagsire"]);
    expect(root.formId).toBeUndefined();
  });

  it("lets Paldean Wooper evolve only into Clodsire", () => {
    const root = evolutionForForm(wooper(), "wooper-paldea", 194);
    expect(names(root)).toEqual(["clodsire"]);
    expect(root.formId).toBe(10253);
  });

  it("follows the Pokémon on screen further along the chain", () => {
    expect(names(evolutionForForm(wooper(), "quagsire", 195))).toEqual([
      "quagsire",
    ]);
    const clodsire = evolutionForForm(wooper(), "clodsire", 980);
    expect(names(clodsire)).toEqual(["clodsire"]);
    expect(clodsire.formId).toBe(10253);
  });

  const meowth = () =>
    node(
      52,
      "meowth",
      [],
      [
        node(53, "persian", [
          method({ level: 28 }),
          method({
            level: 28,
            requiredForm: "meowth-alola",
            evolvedForm: "persian-alola",
          }),
        ], [], { persian: 53, "persian-alola": 10107 }),
        node(863, "perrserker", [
          method({ level: 28, requiredForm: "meowth-galar" }),
        ]),
      ],
      { meowth: 52, "meowth-alola": 10107, "meowth-galar": 10161 },
    );

  it("gives each Meowth its own evolution", () => {
    const plain = evolutionForForm(meowth(), "meowth", 52);
    expect(names(plain)).toEqual(["persian"]);
    expect(plain.formId).toBeUndefined();
    expect(plain.evolvesTo[0].methods).toHaveLength(1);

    const alola = evolutionForForm(meowth(), "meowth-alola", 52);
    expect(names(alola)).toEqual(["persian"]);
    expect(alola.formId).toBe(10107);
    expect(alola.evolvesTo[0].formId).toBe(10107);

    const galar = evolutionForForm(meowth(), "meowth-galar", 52);
    expect(names(galar)).toEqual(["perrserker"]);
    expect(galar.formId).toBe(10161);
  });

  it("keeps branches that do not depend on the region", () => {
    const eevee = node(133, "eevee", [], [
      node(134, "vaporeon", [method({ requiredForm: "eevee" })]),
      node(135, "jolteon", [method({ requiredForm: "eevee" })]),
    ]);
    expect(names(evolutionForForm(eevee, "eevee", 133))).toEqual([
      "vaporeon",
      "jolteon",
    ]);
  });
});
