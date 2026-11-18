import { describe, expect, it } from "vitest";
import {
  fillEffectChance,
  parseMoveDescriptions,
  parseMoveEffects,
  parseMoveInfo,
} from "@/lib/pokeapi/moves";

const flavor = (language: string, game: string, text: string) => ({
  flavor_text: text,
  language: { name: language },
  version_group: { name: game },
});

describe("parseMoveDescriptions", () => {
  const entries = [
    flavor("en", "x-y", "Old English"),
    flavor("en", "scarlet-violet", "Scarlet English"),
    flavor("en", "legends-za", "Newest English"),
    flavor("de", "x-y", "Alter\ntext"),
    flavor("de", "sword-shield", "Neuester deutscher Text"),
    flavor("zh-hans", "x-y", "日本語"),
  ];

  it("uses the text of the selected game", () => {
    expect(parseMoveDescriptions(entries, "scarlet-violet").en).toBe(
      "Scarlet English",
    );
  });

  it("falls back to the newest text in the same language", () => {
    expect(parseMoveDescriptions(entries, "scarlet-violet").de).toBe(
      "Neuester deutscher Text",
    );
  });

  it("uses Japanese with kanji for a game, else the kana version", () => {
    const japanese = [
      flavor("ja-hrkt", "x-y", "つよい\u3000でんげきを\nあびせる"),
      flavor("ja", "x-y", "強い\u3000電撃を\n浴びせる"),
      flavor("ja-hrkt", "red-blue", "ひのこ"),
    ];
    expect(parseMoveDescriptions(japanese, "x-y").ja).toBe(
      "強い 電撃を浴びせる",
    );
    expect(parseMoveDescriptions(japanese, "red-blue").ja).toBe("ひのこ");
  });

  it("falls back to the kanji twin of the newest text", () => {
    const japanese = [
      flavor("ja", "sword-shield", "強い電撃"),
      flavor("ja-hrkt", "sword-shield", "つよいでんげき"),
    ];
    expect(parseMoveDescriptions(japanese, "red-blue").ja).toBe("強い電撃");
  });

  it("cleans line breaks and leaves out languages without text", () => {
    const result = parseMoveDescriptions(entries, "x-y");
    expect(result.de).toBe("Alter text");
    expect(result.fr).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual(["de", "en"]);
  });
});

describe("fillEffectChance", () => {
  it("fills in the chance", () => {
    expect(fillEffectChance("Has a $effect_chance% chance to burn.", 10)).toBe(
      "Has a 10% chance to burn.",
    );
  });

  it("drops the placeholder when the move has no chance", () => {
    expect(
      fillEffectChance("Has a $effect_chance% chance to burn.", null),
    ).toBe("Has a chance to burn.");
  });

  it("leaves text without a placeholder alone", () => {
    expect(fillEffectChance("Inflicts regular damage.", 30)).toBe(
      "Inflicts regular damage.",
    );
  });
});

describe("parseMoveEffects", () => {
  it("keeps English and French, with the chance filled in", () => {
    expect(
      parseMoveEffects(
        [
          {
            short_effect: "Has a $effect_chance% chance to burn.",
            language: { name: "en" },
          },
          {
            short_effect: "A $effect_chance% de chances de brûler.",
            language: { name: "fr" },
          },
          { short_effect: "日本語", language: { name: "zh-hans" } },
        ],
        10,
      ),
    ).toEqual({
      en: "Has a 10% chance to burn.",
      fr: "A 10% de chances de brûler.",
    });
  });
});

describe("parseMoveInfo", () => {
  const move = {
    name: "flamethrower",
    names: [
      { name: "Flamethrower", language: { name: "en" } },
      { name: "Flammenwurf", language: { name: "de" } },
      { name: "火炎放射", language: { name: "zh-hans" } },
    ],
    type: { name: "fire" },
    damage_class: { name: "special" },
    power: 90,
    accuracy: 100,
    pp: 15,
    effect_chance: 10,
    priority: 0,
    target: { name: "selected-pokemon" },
    effect_entries: [
      {
        short_effect: "Has a $effect_chance% chance to burn the target.",
        language: { name: "en" },
      },
    ],
    flavor_text_entries: [
      flavor("en", "scarlet-violet", "Blasts the target with fire."),
    ],
  };

  it("maps the fields", () => {
    expect(parseMoveInfo(move, "scarlet-violet")).toEqual({
      name: "flamethrower",
      names: { en: "Flamethrower", de: "Flammenwurf" },
      type: "fire",
      damageClass: "special",
      power: 90,
      accuracy: 100,
      pp: 15,
      descriptions: { en: "Blasts the target with fire." },
      effects: { en: "Has a 10% chance to burn the target." },
      effectChance: 10,
      priority: 0,
      target: "selected-pokemon",
    });
  });

  it("keeps null stats of status moves and ignores unknown classes", () => {
    const info = parseMoveInfo(
      {
        ...move,
        name: "growl",
        names: [],
        type: { name: "normal" },
        damage_class: { name: "weird" },
        power: null,
        effect_chance: null,
        priority: -1,
      },
      "scarlet-violet",
    );
    expect(info.power).toBeNull();
    expect(info.damageClass).toBeNull();
    expect(info.effectChance).toBeNull();
    expect(info.priority).toBe(-1);
  });
});
