import { describe, expect, it } from "vitest";
import {
  parseAbilityTexts,
  parseLocalizedNames,
  parseArtwork,
  cleanFlavorText,
  parseDescriptions,
  parseDetail,
  methodRefs,
  parseEvolution,
  parseEvolutionMethod,
  parseForms,
  parsePokemonFormNames,
  parseGameDescriptions,
  parseGameSprites,
  parseGender,
  parseGenera,
  parseShinyArtwork,
  parsePastAbilities,
  parsePastStats,
  parsePastTypes,
  parseTypeChart,
  withEvolutionNames,
  withMethodNames,
} from "@/lib/pokeapi/detail";

const species = (name: string, id: number) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
});
const variety = (name: string, id: number, isDefault = false) => ({
  is_default: isDefault,
  pokemon: {
    name,
    url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
  },
});
/** The species fields the parsers need. */
const speciesExtras = {
  genera: [],
};
const levelUp = (level: number) => ({
  min_level: level,
  item: null,
  trigger: { name: "level-up" },
});

describe("parseGender", () => {
  it("returns null for genderless Pokémon", () => {
    expect(parseGender(-1)).toBeNull();
  });

  it("converts eighths to percentages", () => {
    expect(parseGender(0)).toEqual({ male: 100, female: 0 });
    expect(parseGender(1)).toEqual({ male: 87.5, female: 12.5 });
    expect(parseGender(4)).toEqual({ male: 50, female: 50 });
    expect(parseGender(8)).toEqual({ male: 0, female: 100 });
  });
});

describe("parseLocalizedNames", () => {
  it("keeps English, German and French only", () => {
    expect(
      parseLocalizedNames([
        { name: "Charizard", language: { name: "en" } },
        { name: "Glurak", language: { name: "de" } },
        { name: "Dracaufeu", language: { name: "fr" } },
        { name: "리자몽", language: { name: "zh-hans" } },
      ]),
    ).toEqual({ en: "Charizard", de: "Glurak", fr: "Dracaufeu" });
  });

  it("keeps Spanish, Italian and Korean, but not Latin American Spanish", () => {
    expect(
      parseLocalizedNames([
        { name: "Dracaufeu", language: { name: "fr" } },
        { name: "Charizard", language: { name: "es" } },
        { name: "Charizard", language: { name: "es-419" } },
        { name: "Charizard", language: { name: "it" } },
        { name: "리자몽", language: { name: "ko" } },
      ]),
    ).toEqual({
      fr: "Dracaufeu",
      es: "Charizard",
      it: "Charizard",
      ko: "리자몽",
    });
  });

  it("prefers Japanese with kanji over the kana-only version", () => {
    const hrkt = { name: "ふぶき", language: { name: "ja-hrkt" } };
    const kanji = { name: "吹雪", language: { name: "ja" } };
    expect(parseLocalizedNames([hrkt, kanji])).toEqual({ ja: "吹雪" });
    expect(parseLocalizedNames([kanji, hrkt])).toEqual({ ja: "吹雪" });
    expect(parseLocalizedNames([hrkt])).toEqual({ ja: "ふぶき" });
  });
});

describe("parsePokemonFormNames", () => {
  it("keeps supported languages and prefers Japanese kanji", () => {
    expect(
      parsePokemonFormNames({
        form_names: [
          { name: "Mega X", language: { name: "en" } },
          { name: "Mega X", language: { name: "de" } },
          { name: "メガX", language: { name: "ja-hrkt" } },
          { name: "メガＸ", language: { name: "ja" } },
          { name: "Méga X", language: { name: "fr" } },
        ],
      }),
    ).toEqual({ en: "Mega X", de: "Mega X", ja: "メガＸ", fr: "Méga X" });
  });

  it("returns no translations when the form has no names", () => {
    expect(parsePokemonFormNames({ form_names: [] })).toEqual({});
  });
});

describe("parseAbilityTexts", () => {
  const effect = (language: string, text: string, fullEffect = "") => ({
    effect: fullEffect,
    short_effect: text,
    language: { name: language },
  });
  const flavor = (language: string, text: string) => ({
    flavor_text: text,
    language: { name: language },
  });
  const names = [
    { name: "Blaze", language: { name: "en" } },
    { name: "Großbrand", language: { name: "de" } },
  ];

  it("uses the short effect per language and normalises whitespace", () => {
    expect(
      parseAbilityTexts({
        names,
        effect_entries: [
          effect("en", "Boosts\n fire."),
          effect("de", "Stärkt Feuer."),
        ],
        flavor_text_entries: [flavor("en", "flavor")],
      }),
    ).toEqual({
      names: { en: "Blaze", de: "Großbrand" },
      descriptions: { en: "Boosts fire.", de: "Stärkt Feuer." },
      effectDescriptions: {},
      gameDescriptions: {},
    });
  });

  it("falls back to the latest flavor text per language", () => {
    expect(
      parseAbilityTexts({
        names,
        effect_entries: [],
        flavor_text_entries: [
          flavor("en", "old"),
          flavor("fr", "français"),
          flavor("en", "new"),
        ],
      }).descriptions,
    ).toEqual({ en: "new", fr: "français" });
  });

  it("leaves languages without any text out", () => {
    expect(
      parseAbilityTexts({
        names,
        effect_entries: [effect("zh-hans", "日本語")],
        flavor_text_entries: [],
      }).descriptions,
    ).toEqual({});
  });

  it("keeps full effects separate and preserves paragraph breaks", () => {
    expect(
      parseAbilityTexts({
        names,
        effect_entries: [
          effect("en", "Short effect.", "First paragraph.\n\nSecond\nparagraph."),
          effect("de", "Kurzer Effekt.", "Ausführliche Wirkung."),
          effect("fr", "", " \n  "),
        ],
        flavor_text_entries: [],
      }).effectDescriptions,
    ).toEqual({
      en: "First paragraph.\n\nSecond paragraph.",
      de: "Ausführliche Wirkung.",
    });
  });

  it("keeps flavor text by version group and prefers Japanese kanji", () => {
    expect(
      parseAbilityTexts({
        names,
        effect_entries: [],
        flavor_text_entries: [
          { ...flavor("en", "Boosts fire.\n"), version_group: { name: "x-y" } },
          { ...flavor("ja-hrkt", "かな"), version_group: { name: "x-y" } },
          { ...flavor("ja", "漢字"), version_group: { name: "x-y" } },
          { ...flavor("en", "Newer fire text."), version_group: { name: "sword-shield" } },
          { ...flavor("en", "No game group") },
          { ...flavor("fr", "   "), version_group: { name: "scarlet-violet" } },
        ],
      }),
    ).toEqual({
      names: { en: "Blaze", de: "Großbrand" },
      descriptions: { en: "No game group", ja: "漢字" },
      effectDescriptions: {},
      gameDescriptions: {
        "x-y": { en: "Boosts fire.", ja: "漢字" },
        "sword-shield": { en: "Newer fire text." },
      },
    });
  });
});

describe("parseDetail", () => {
  it("maps the raw responses", () => {
    const detail = parseDetail(
      {
        id: 6,
        name: "charizard",
        height: 17,
        weight: 905,
        cries: { latest: "latest.ogg", legacy: "legacy.ogg" },
        types: [
          { slot: 2, type: { name: "flying" } },
          { slot: 1, type: { name: "fire" } },
        ],
        abilities: [
          { slot: 3, is_hidden: true, ability: { name: "solar-power" } },
          { slot: 1, is_hidden: false, ability: { name: "blaze" } },
        ],
        stats: [
          { base_stat: 78, stat: { name: "hp" } },
          { base_stat: 84, stat: { name: "attack" } },
        ],
        sprites: {
          front_default: "front.png",
          other: { "official-artwork": { front_default: "art.png" } },
        },
      },
      {
        id: 6,
        name: "charizard",
        names: [{ name: "Glurak", language: { name: "de" } }],
        flavor_text_entries: [
          { flavor_text: "Spits fire.\nHot!", language: { name: "en" } },
        ],
        gender_rate: 1,
        ...speciesExtras,
        genera: [{ genus: "Flame Pokémon", language: { name: "en" } }],
        evolution_chain: { url: "" },
        varieties: [
          variety("charizard", 6, true),
          variety("charizard-mega-x", 10034),
        ],
      },
      {
        blaze: {
          names: { en: "Blaze" },
          descriptions: { en: "Powers up fire moves." },
          effectDescriptions: {},
          gameDescriptions: {},
        },
      },
      { id: 6, name: "charizard", names: {}, methods: [], evolvesTo: [] },
      [
        {
          name: "fire",
          damage_relations: {
            double_damage_from: [{ name: "water" }],
            half_damage_from: [{ name: "fire" }],
            no_damage_from: [],
            double_damage_to: [{ name: "grass" }],
            half_damage_to: [{ name: "water" }],
            no_damage_to: [],
          },
        },
      ],
      [],
    );

    expect(detail).toEqual({
      id: 6,
      speciesName: "charizard",
      names: { de: "Glurak" },
      descriptions: { en: "Spits fire. Hot!" },
      gameDescriptions: {},
      pokemonId: 6,
      name: "charizard",
      forms: [
        { id: 6, name: "charizard", isDefault: true },
        { id: 10034, name: "charizard-mega-x", isDefault: false },
      ],
      artwork: "art.png",
      shinyArtwork: null,
      types: ["fire", "flying"],
      heightMeters: 1.7,
      weightKg: 90.5,
      genus: { en: "Flame Pokémon" },
      gameSprites: {},
      cry: "latest.ogg",
      gender: { male: 87.5, female: 12.5 },
      abilities: [
        {
          slot: 1,
          name: "blaze",
          hidden: false,
          names: { en: "Blaze" },
          descriptions: { en: "Powers up fire moves." },
          effectDescriptions: {},
          gameDescriptions: {},
        },
        {
          slot: 3,
          name: "solar-power",
          hidden: true,
          names: {},
          descriptions: {},
          effectDescriptions: {},
          gameDescriptions: {},
        },
      ],
      stats: [
        { name: "hp", value: 78 },
        { name: "attack", value: 84 },
      ],
      games: [],
      defaultGame: null,
      pastStats: [],
      pastAbilities: [],
      pastTypes: [],
      typeCharts: [{ name: "fire", relations: expect.any(Object), past: [] }],
      matchups: {
        defense: expect.objectContaining({ water: 2, fire: 0.5, grass: 1 }),
        offense: expect.objectContaining({ grass: 2, water: 0.5, fire: 1 }),
      },
      evolution: {
        id: 6,
        name: "charizard",
        names: {},
        methods: [],
        evolvesTo: [],
      },
    });
  });
});

describe("parseEvolution", () => {
  it("builds a linear chain with level conditions", () => {
    const tree = parseEvolution({
      species: species("charmander", 4),
      evolution_details: [],
      evolves_to: [
        {
          species: species("charmeleon", 5),
          evolution_details: [levelUp(16)],
          evolves_to: [
            {
              species: species("charizard", 6),
              evolution_details: [levelUp(36)],
              evolves_to: [],
            },
          ],
        },
      ],
    });

    expect(tree.id).toBe(4);
    expect(tree.methods).toEqual([]);
    expect(tree.evolvesTo[0].methods).toEqual([
      { game: null, isDefault: false, trigger: "level-up", level: 16 },
    ]);
    expect(tree.evolvesTo[0].evolvesTo[0]).toMatchObject({
      id: 6,
      name: "charizard",
      methods: [expect.objectContaining({ level: 36 })],
      evolvesTo: [],
    });
  });

  it("keeps every branch of a branching chain", () => {
    const tree = parseEvolution({
      species: species("eevee", 133),
      evolution_details: [],
      evolves_to: [
        {
          species: species("vaporeon", 134),
          evolution_details: [
            {
              min_level: null,
              item: { name: "water-stone" },
              trigger: { name: "use-item" },
            },
          ],
          evolves_to: [],
        },
        {
          species: species("jolteon", 135),
          evolution_details: [
            {
              min_level: null,
              item: { name: "thunder-stone" },
              trigger: { name: "use-item" },
            },
          ],
          evolves_to: [],
        },
      ],
    });

    expect(tree.evolvesTo.map((node) => node.name)).toEqual([
      "vaporeon",
      "jolteon",
    ]);
    expect(tree.evolvesTo[0].methods[0].item?.name).toBe("water-stone");
  });

  it("returns a single node for Pokémon that do not evolve", () => {
    expect(
      parseEvolution({
        species: species("tauros", 128),
        evolution_details: [],
        evolves_to: [],
      }),
    ).toEqual({
      id: 128,
      name: "tauros",
      names: {},
      methods: [],
      evolvesTo: [],
    });
  });
});

describe("parseGenera", () => {
  it("keeps the languages we show", () => {
    expect(
      parseGenera([
        { genus: "Mouse Pokémon", language: { name: "en" } },
        { genus: "Maus-Pokémon", language: { name: "de" } },
        { genus: "鼠宝可梦", language: { name: "zh-hans" } },
      ]),
    ).toEqual({ en: "Mouse Pokémon", de: "Maus-Pokémon" });
  });
});

describe("parseGameSprites", () => {
  const pokemon = (
    versions: Record<string, Record<string, object>>,
    id = 1,
  ) =>
    ({
      id,
      sprites: { front_default: null, versions },
    }) as unknown as Parameters<typeof parseGameSprites>[0];

  it("keys the front sprites by game and skips the menu icons", () => {
    expect(
      parseGameSprites(
        pokemon({
          "generation-i": {
            "red-blue": { front_default: "rb.png", front_shiny: null },
            yellow: { front_default: null },
          },
          "generation-ii": {
            crystal: { front_default: "c.png", front_shiny: "cs.png" },
            icons: { front_default: "icon.png" },
          },
        }),
      ),
    ).toEqual({
      "red-blue": { front: "rb.png", shiny: null },
      crystal: { front: "c.png", shiny: "cs.png" },
    });
  });

  it("is empty without version sprites", () => {
    expect(
      parseGameSprites({ sprites: { front_default: null } } as never),
    ).toEqual({});
  });

  it("swaps only Black and White Kyurem Scarlet/Violet front sprite URLs", () => {
    const sprites = (id: number) =>
      parseGameSprites(
        pokemon(
          {
            "generation-ix": {
              "scarlet-violet": {
                front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/${id}.webp`,
                front_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/${id}.webp`,
              },
            },
          },
          id,
        ),
      )["scarlet-violet"];

    expect(sprites(10022)).toEqual({
      front:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/10023.webp",
      shiny:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/10023.webp",
    });
    expect(sprites(10023)).toEqual({
      front:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/10022.webp",
      shiny:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/10022.webp",
    });
  });

  it("keeps all other Scarlet/Violet and game sprite URLs unchanged", () => {
    const sprite = (id: number) =>
      parseGameSprites(
        pokemon(
          {
            "generation-ix": {
              "scarlet-violet": {
                front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/${id}.webp`,
                front_shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/${id}.webp`,
              },
            },
            "generation-viii": {
              "sword-shield": {
                front_default:
                  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/sword-shield/10022.png",
                front_shiny:
                  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/sword-shield/shiny/10022.png",
              },
            },
          },
          id,
        ),
      );

    expect(sprite(646)["scarlet-violet"]).toEqual({
      front:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/646.webp",
      shiny:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/shiny/646.webp",
    });
    expect(sprite(10022)["sword-shield"]).toEqual({
      front:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/sword-shield/10022.png",
      shiny:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/sword-shield/shiny/10022.png",
    });
    expect(
      parseGameSprites(
        pokemon(
          {
            "generation-ix": {
              "scarlet-violet": {
                front_default: "https://example.test/10022.webp",
                front_shiny: "https://example.test/shiny/10022.webp",
              },
            },
          },
          10022,
        ),
      )["scarlet-violet"],
    ).toEqual({
      front: "https://example.test/10022.webp",
      shiny: "https://example.test/shiny/10022.webp",
    });
  });
});

describe("parseForms", () => {
  it("lists every variety with its pokemon id", () => {
    expect(
      parseForms({
        id: 6,
        name: "charizard",
        names: [],
        flavor_text_entries: [],
        gender_rate: 1,
        ...speciesExtras,
        evolution_chain: { url: "" },
        varieties: [
          variety("charizard", 6, true),
          variety("charizard-mega-x", 10034),
          variety("charizard-gmax", 10196),
        ],
      }),
    ).toEqual([
      { id: 6, name: "charizard", isDefault: true },
      { id: 10034, name: "charizard-mega-x", isDefault: false },
      { id: 10196, name: "charizard-gmax", isDefault: false },
    ]);
  });
});

describe("parseArtwork", () => {
  const pokemon = (sprites: Parameters<typeof parseArtwork>[0]["sprites"]) => ({
    id: 1,
    name: "x",
    height: 1,
    weight: 1,
    types: [],
    abilities: [],
    stats: [],
    sprites,
  });

  it("prefers the official artwork", () => {
    expect(
      parseArtwork(
        pokemon({
          front_default: "front.png",
          other: { "official-artwork": { front_default: "art.png" } },
        }),
      ),
    ).toBe("art.png");
  });

  it("falls back to the front sprite, then null", () => {
    expect(
      parseArtwork(
        pokemon({
          front_default: "front.png",
          other: { "official-artwork": { front_default: null } },
        }),
      ),
    ).toBe("front.png");
    expect(parseArtwork(pokemon({ front_default: null }))).toBeNull();
  });
});

describe("parseDetail games", () => {
  const entry = (move: string, game: string, id: number, method: string) => ({
    move: { name: move },
    version_group_details: [
      {
        level_learned_at: 1,
        move_learn_method: { name: method },
        version_group: {
          name: game,
          url: `https://pokeapi.co/api/v2/version-group/${id}/`,
        },
      },
    ],
  });
  const pokemon = {
    id: 25,
    name: "pikachu",
    height: 4,
    weight: 60,
    types: [],
    abilities: [],
    stats: [],
    sprites: { front_default: null },
    moves: [
      entry("thunder-shock", "red-blue", 1, "level-up"),
      entry("thunderbolt", "x-y", 15, "machine"),
      entry("quick-attack", "x-y", 15, "level-up"),
    ],
  };
  const species = {
    id: 25,
    name: "pikachu",
    names: [],
    flavor_text_entries: [],
    gender_rate: 4,
    ...speciesExtras,
    evolution_chain: { url: "" },
    varieties: [],
  };
  const root = {
    id: 25,
    name: "pikachu",
    names: {},
    methods: [],
    evolvesTo: [],
  };

  it("lists the games with moves, newest first, and the default game", () => {
    const detail = parseDetail(pokemon, species, {}, root, []);
    expect(detail.games).toEqual(["x-y", "red-blue"]);
    expect(detail.defaultGame).toBe("x-y");
  });

  it("has no games without moves", () => {
    const detail = parseDetail(
      { ...pokemon, moves: [] },
      species,
      {},
      root,
      [],
    );
    expect(detail.games).toEqual([]);
    expect(detail.defaultGame).toBeNull();
  });
});

describe("parseShinyArtwork", () => {
  const pokemon = (sprites: Parameters<typeof parseArtwork>[0]["sprites"]) =>
    ({ sprites }) as Parameters<typeof parseArtwork>[0];

  it("prefers the official shiny artwork, then the shiny sprite", () => {
    expect(
      parseShinyArtwork(
        pokemon({
          front_default: "front.png",
          front_shiny: "shiny.png",
          other: {
            "official-artwork": {
              front_default: "a.png",
              front_shiny: "art.png",
            },
          },
        }),
      ),
    ).toBe("art.png");
    expect(
      parseShinyArtwork(
        pokemon({ front_default: "front.png", front_shiny: "shiny.png" }),
      ),
    ).toBe("shiny.png");
  });

  it("is null without any shiny image", () => {
    expect(
      parseShinyArtwork(pokemon({ front_default: "front.png" })),
    ).toBeNull();
  });
});

describe("withEvolutionNames", () => {
  it("fills in names for every stage, also nested ones", () => {
    const tree = parseEvolution({
      species: species("charmander", 4),
      evolution_details: [],
      evolves_to: [
        {
          species: species("charmeleon", 5),
          evolution_details: [levelUp(16)],
          evolves_to: [],
        },
      ],
    });
    const named = withEvolutionNames(
      tree,
      new Map([
        [4, { en: "Charmander", de: "Glumanda" }],
        [5, { en: "Charmeleon", de: "Glutexo" }],
      ]),
    );
    expect(named.names.de).toBe("Glumanda");
    expect(named.evolvesTo[0].names.de).toBe("Glutexo");
    expect(tree.names).toEqual({});
  });

  it("uses empty names for unknown stages", () => {
    const tree = parseEvolution({
      species: species("tauros", 128),
      evolution_details: [],
      evolves_to: [],
    });
    expect(withEvolutionNames(tree, new Map()).names).toEqual({});
  });
});

describe("cleanFlavorText", () => {
  it("turns the game's line breaks into spaces", () => {
    expect(cleanFlavorText("Its wings\ncarry it\fhigh.")).toBe(
      "Its wings carry it high.",
    );
  });

  it("removes soft hyphens and keeps non-breaking spaces in numbers", () => {
    expect(cleanFlavorText("Fly\u00ading to 1\u202f400 m")).toBe(
      "Flying to 1\u202f400 m",
    );
  });
});

describe("cleanFlavorText in Japanese", () => {
  it("removes line breaks instead of adding spaces", () => {
    expect(
      cleanFlavorText("ほっぺたの\u3000りょうがわに\nちいさい", "ja"),
    ).toBe("ほっぺたの りょうがわにちいさい");
  });
});

describe("parseDescriptions", () => {
  const entry = (language: string, text: string) => ({
    flavor_text: text,
    language: { name: language },
  });

  it("keeps the newest entry per language and drops other languages", () => {
    expect(
      parseDescriptions([
        entry("en", "old\ntext"),
        entry("de", "Alt"),
        entry("zh-hans", "日本語"),
        entry("en", "new\ntext"),
        entry("de", "Neu"),
      ]),
    ).toEqual({ en: "new text", de: "Neu" });
  });

  it("treats both kinds of Japanese as one language, newest first", () => {
    const entry = (language: string, text: string) => ({
      flavor_text: text,
      language: { name: language },
    });
    expect(
      parseDescriptions([
        entry("ja-hrkt", "しっぽを\nたてて"),
        entry("ja", "尻尾を\u3000立てて\n探る"),
      ]),
    ).toEqual({ ja: "尻尾を 立てて探る" });
  });

  it("keeps the kanji text of a game whichever Japanese version comes first", () => {
    const entry = (language: string, version: string, text: string) => ({
      flavor_text: text,
      language: { name: language },
      version: { name: version },
    });
    const kana = entry("ja-hrkt", "x", "しっぽ");
    const kanji = entry("ja", "x", "尻尾");
    expect(parseDescriptions([kana, kanji])).toEqual({ ja: "尻尾" });
    expect(parseDescriptions([kanji, kana])).toEqual({ ja: "尻尾" });
    // A newer game's kana text still replaces an older game's kanji text.
    expect(
      parseDescriptions([kanji, entry("ja-hrkt", "sword", "つるぎ")]),
    ).toEqual({ ja: "つるぎ" });
  });

  it("skips entries that are empty after cleaning", () => {
    expect(
      parseDescriptions([entry("en", "good"), entry("en", " \n ")]),
    ).toEqual({
      en: "good",
    });
  });

  it("returns nothing without entries", () => {
    expect(parseDescriptions([])).toEqual({});
  });
});

describe("parseGameDescriptions", () => {
  const entry = (version: string, language: string, text: string) => ({
    flavor_text: text,
    language: { name: language },
    version: { name: version },
  });

  it("groups the versions of one game and keeps the newest text", () => {
    expect(
      parseGameDescriptions([
        entry("red", "en", "Red text"),
        entry("blue", "en", "Blue text"),
        entry("gold", "en", "Gold text"),
        entry("gold", "de", "Gold Text"),
      ]),
    ).toEqual({
      "red-blue": { en: "Blue text" },
      "gold-silver": { en: "Gold text", de: "Gold Text" },
    });
  });

  it("skips unknown versions and entries without a version", () => {
    expect(
      parseGameDescriptions([
        entry("some-new-version", "en", "text"),
        { flavor_text: "text", language: { name: "en" } },
        entry("red", "zh-hans", "日本語"),
      ]),
    ).toEqual({});
  });
});

describe("past stats and types", () => {
  const generation = (id: number) => ({
    url: `https://pokeapi.co/api/v2/generation/${id}/`,
  });
  const relations = (doubleFrom: string[]) => ({
    double_damage_from: doubleFrom.map((type) => ({ name: type })),
    half_damage_from: [],
    no_damage_from: [],
    double_damage_to: [],
    half_damage_to: [],
    no_damage_to: [],
  });
  const pokemon = {
    past_stats: [
      {
        generation: generation(5),
        stats: [{ base_stat: 30, stat: { name: "defense" } }],
      },
      {
        generation: generation(1),
        stats: [{ base_stat: 50, stat: { name: "special" } }],
      },
    ],
    past_types: [
      {
        generation: generation(5),
        types: [{ slot: 1, type: { name: "normal" } }],
      },
    ],
    past_abilities: [
      {
        generation: generation(4),
        abilities: [
          { slot: 3, is_hidden: true, ability: null },
          { slot: 1, is_hidden: false, ability: { name: "levitate" } },
        ],
      },
    ],
  } as unknown as Parameters<typeof parsePastStats>[0];

  it("reads past stats, oldest generation first", () => {
    expect(parsePastStats(pokemon)).toEqual([
      { generation: 1, stats: [{ name: "special", value: 50 }] },
      { generation: 5, stats: [{ name: "defense", value: 30 }] },
    ]);
  });

  it("reads past types", () => {
    expect(parsePastTypes(pokemon)).toEqual([
      { generation: 5, types: ["normal"] },
    ]);
  });

  it("reads past abilities, with texts and empty slots", () => {
    expect(
      parsePastAbilities(pokemon, {
        levitate: {
          names: { en: "Levitate" },
          descriptions: {},
          effectDescriptions: {},
          gameDescriptions: { "gold-silver": { en: "Raises Speed." } },
        },
      }),
    ).toEqual([
      {
        generation: 4,
        slots: [
          { slot: 3, ability: null },
          {
            slot: 1,
            ability: {
              slot: 1,
              name: "levitate",
              hidden: false,
              names: { en: "Levitate" },
              descriptions: {},
              effectDescriptions: {},
              gameDescriptions: { "gold-silver": { en: "Raises Speed." } },
            },
          },
        ],
      },
    ]);
  });

  it("reads a type chart with its earlier versions, oldest first", () => {
    expect(
      parseTypeChart({
        name: "ghost",
        damage_relations: relations(["ghost", "dark"]),
        past_damage_relations: [
          { generation: generation(5), damage_relations: relations(["ghost"]) },
          { generation: generation(1), damage_relations: relations([]) },
        ],
      }),
    ).toEqual({
      name: "ghost",
      relations: relations(["ghost", "dark"]),
      past: [
        { generation: 1, relations: relations([]) },
        { generation: 5, relations: relations(["ghost"]) },
      ],
    });
  });

  it("has nothing for a Pokémon without history", () => {
    const plain = {} as Parameters<typeof parsePastStats>[0];
    expect(parsePastStats(plain)).toEqual([]);
    expect(parsePastTypes(plain)).toEqual([]);
    expect(parsePastAbilities(plain, {})).toEqual([]);
  });
});

describe("parseEvolutionMethod", () => {
  const detail = (extra: object) => ({
    min_level: null,
    item: null,
    trigger: { name: "level-up" },
    ...extra,
  });

  it("keeps only what is set", () => {
    expect(
      parseEvolutionMethod(
        detail({
          min_happiness: 160,
          time_of_day: "day",
          min_beauty: null,
          needs_overworld_rain: false,
          gender: null,
          held_item: null,
          version_group: { name: "gold-silver" },
          is_default: true,
        }),
      ),
    ).toEqual({
      game: "gold-silver",
      isDefault: true,
      trigger: "level-up",
      happiness: 160,
      timeOfDay: "day",
    });
  });

  it("reads moves, places, items and the yes/no conditions", () => {
    expect(
      parseEvolutionMethod(
        detail({
          known_move: { name: "ancient-power" },
          location: { name: "eterna-forest" },
          held_item: { name: "metal-coat" },
          known_move_type: { name: "fairy" },
          near_special_rock: true,
          relative_physical_stats: 0,
        }),
      ),
    ).toEqual({
      game: null,
      isDefault: false,
      trigger: "level-up",
      knownMove: { name: "ancient-power", names: {} },
      location: { name: "eterna-forest", names: {} },
      heldItem: { name: "metal-coat", names: {} },
      knownMoveType: "fairy",
      nearRock: true,
      statsRelation: 0,
    });
  });
});

describe("methodRefs and withMethodNames", () => {
  const tree = parseEvolution({
    species: species("eevee", 133),
    evolution_details: [],
    evolves_to: [
      {
        species: species("leafeon", 470),
        evolution_details: [
          {
            min_level: null,
            item: { name: "leaf-stone" },
            trigger: { name: "use-item" },
          },
          {
            min_level: null,
            item: null,
            trigger: { name: "level-up" },
            location: { name: "eterna-forest" },
          },
        ],
        evolves_to: [],
      },
      {
        species: species("mamoswine", 473),
        evolution_details: [
          {
            min_level: null,
            item: null,
            trigger: { name: "level-up" },
            known_move: { name: "ancient-power" },
          },
        ],
        evolves_to: [],
      },
    ],
  });

  it("lists the items, moves and places once each", () => {
    expect(methodRefs(tree)).toEqual({
      item: ["leaf-stone"],
      move: ["ancient-power"],
      location: ["eterna-forest"],
    });
  });

  it("fills in their names", () => {
    const named = withMethodNames(tree, (kind, name) => ({
      en: `${kind}:${name}`,
    }));
    expect(named.evolvesTo[0].methods[0].item?.names).toEqual({
      en: "item:leaf-stone",
    });
    expect(named.evolvesTo[0].methods[1].location?.names).toEqual({
      en: "location:eterna-forest",
    });
    expect(named.evolvesTo[1].methods[0].knownMove?.names).toEqual({
      en: "move:ancient-power",
    });
  });
});
