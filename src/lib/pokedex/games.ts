import type { Language } from "@/lib/i18n/languages";
import { formatName } from "./format";

/** Game titles for PokéAPI version groups; unknown groups fall back to the slug. */
const GAME_TITLES: Record<string, string> = {
  "red-blue": "Red / Blue",
  yellow: "Yellow",
  "gold-silver": "Gold / Silver",
  crystal: "Crystal",
  "ruby-sapphire": "Ruby / Sapphire",
  emerald: "Emerald",
  "firered-leafgreen": "FireRed / LeafGreen",
  "diamond-pearl": "Diamond / Pearl",
  platinum: "Platinum",
  "heartgold-soulsilver": "HeartGold / SoulSilver",
  "black-white": "Black / White",
  colosseum: "Colosseum",
  xd: "XD: Gale of Darkness",
  "black-2-white-2": "Black 2 / White 2",
  "x-y": "X / Y",
  "omega-ruby-alpha-sapphire": "Omega Ruby / Alpha Sapphire",
  "sun-moon": "Sun / Moon",
  "ultra-sun-ultra-moon": "Ultra Sun / Ultra Moon",
  "lets-go-pikachu-lets-go-eevee": "Let's Go, Pikachu! / Eevee!",
  "sword-shield": "Sword / Shield",
  "the-isle-of-armor": "The Isle of Armor",
  "the-crown-tundra": "The Crown Tundra",
  "brilliant-diamond-shining-pearl": "Brilliant Diamond / Shining Pearl",
  "legends-arceus": "Legends: Arceus",
  "scarlet-violet": "Scarlet / Violet",
  "the-teal-mask": "The Teal Mask",
  "the-indigo-disk": "The Indigo Disk",
  "legends-za": "Legends: Z-A",
  "mega-dimension": "Mega Dimension",
  champions: "Champions",
};

/** Japanese titles; games missing here show the English title. */
const GAME_TITLES_JA: Record<string, string> = {
  "red-blue": "赤・青",
  yellow: "ピカチュウ",
  "gold-silver": "金・銀",
  crystal: "クリスタル",
  "ruby-sapphire": "ルビー・サファイア",
  emerald: "エメラルド",
  "firered-leafgreen": "ファイアレッド・リーフグリーン",
  "diamond-pearl": "ダイヤモンド・パール",
  platinum: "プラチナ",
  "heartgold-soulsilver": "ハートゴールド・ソウルシルバー",
  "black-white": "ブラック・ホワイト",
  colosseum: "コロシアム",
  xd: "XD 暗黒の旋風ダーク・ルギア",
  "black-2-white-2": "ブラック2・ホワイト2",
  "x-y": "X・Y",
  "omega-ruby-alpha-sapphire": "オメガルビー・アルファサファイア",
  "sun-moon": "サン・ムーン",
  "ultra-sun-ultra-moon": "ウルトラサン・ウルトラムーン",
  "lets-go-pikachu-lets-go-eevee": "Let's Go! ピカチュウ・イーブイ",
  "sword-shield": "ソード・シールド",
  "the-isle-of-armor": "鎧の孤島",
  "the-crown-tundra": "冠の雪原",
  "brilliant-diamond-shining-pearl":
    "ブリリアントダイヤモンド・シャイニングパール",
  "legends-arceus": "Pokémon LEGENDS アルセウス",
  "scarlet-violet": "スカーレット・バイオレット",
  "the-teal-mask": "碧の仮面",
  "the-indigo-disk": "藍の円盤",
  "legends-za": "Pokémon LEGENDS Z-A",
  "mega-dimension": "メガディメンション",
};

export function formatGame(versionGroup: string, language?: Language): string {
  return (
    (language === "ja" ? GAME_TITLES_JA[versionGroup] : undefined) ??
    GAME_TITLES[versionGroup] ??
    formatName(versionGroup)
  );
}

/** Generation of each game (PokéAPI version group); unknown games count as the newest. */
const GAME_GENERATIONS: Record<string, number> = {
  "red-blue": 1,
  yellow: 1,
  "gold-silver": 2,
  crystal: 2,
  "ruby-sapphire": 3,
  emerald: 3,
  "firered-leafgreen": 3,
  colosseum: 3,
  xd: 3,
  "diamond-pearl": 4,
  platinum: 4,
  "heartgold-soulsilver": 4,
  "black-white": 5,
  "black-2-white-2": 5,
  "x-y": 6,
  "omega-ruby-alpha-sapphire": 6,
  "sun-moon": 7,
  "ultra-sun-ultra-moon": 7,
  "lets-go-pikachu-lets-go-eevee": 7,
  "sword-shield": 8,
  "the-isle-of-armor": 8,
  "the-crown-tundra": 8,
  "brilliant-diamond-shining-pearl": 8,
  "legends-arceus": 8,
  "scarlet-violet": 9,
  "the-teal-mask": 9,
  "the-indigo-disk": 9,
  "legends-za": 9,
  "mega-dimension": 9,
  champions: 9,
};

export function gameGeneration(versionGroup: string): number {
  return GAME_GENERATIONS[versionGroup] ?? Number.POSITIVE_INFINITY;
}

/** The version group a single game version (e.g. "red") belongs to. */
const VERSION_GROUPS: Record<string, string> = {
  red: "red-blue",
  blue: "red-blue",
  yellow: "yellow",
  gold: "gold-silver",
  silver: "gold-silver",
  crystal: "crystal",
  ruby: "ruby-sapphire",
  sapphire: "ruby-sapphire",
  emerald: "emerald",
  firered: "firered-leafgreen",
  leafgreen: "firered-leafgreen",
  diamond: "diamond-pearl",
  pearl: "diamond-pearl",
  platinum: "platinum",
  heartgold: "heartgold-soulsilver",
  soulsilver: "heartgold-soulsilver",
  black: "black-white",
  white: "black-white",
  colosseum: "colosseum",
  xd: "xd",
  "black-2": "black-2-white-2",
  "white-2": "black-2-white-2",
  x: "x-y",
  y: "x-y",
  "omega-ruby": "omega-ruby-alpha-sapphire",
  "alpha-sapphire": "omega-ruby-alpha-sapphire",
  sun: "sun-moon",
  moon: "sun-moon",
  "ultra-sun": "ultra-sun-ultra-moon",
  "ultra-moon": "ultra-sun-ultra-moon",
  "lets-go-pikachu": "lets-go-pikachu-lets-go-eevee",
  "lets-go-eevee": "lets-go-pikachu-lets-go-eevee",
  sword: "sword-shield",
  shield: "sword-shield",
  "brilliant-diamond": "brilliant-diamond-shining-pearl",
  "shining-pearl": "brilliant-diamond-shining-pearl",
  "legends-arceus": "legends-arceus",
  scarlet: "scarlet-violet",
  violet: "scarlet-violet",
  "legends-za": "legends-za",
};

export function versionGroupOf(version: string): string | null {
  return VERSION_GROUPS[version] ?? null;
}

/** Expansions have no Pokédex texts of their own; they use the main game's. */
const DESCRIPTION_GAMES: Record<string, string> = {
  "the-isle-of-armor": "sword-shield",
  "the-crown-tundra": "sword-shield",
  "the-teal-mask": "scarlet-violet",
  "the-indigo-disk": "scarlet-violet",
  "mega-dimension": "legends-za",
};

export function descriptionGame(versionGroup: string): string {
  return DESCRIPTION_GAMES[versionGroup] ?? versionGroup;
}

/** The games in order of release (the Japanese-only ones left out). */
const GAME_ORDER = [
  "red-blue",
  "yellow",
  "gold-silver",
  "crystal",
  "ruby-sapphire",
  "colosseum",
  "emerald",
  "firered-leafgreen",
  "xd",
  "diamond-pearl",
  "platinum",
  "heartgold-soulsilver",
  "black-white",
  "black-2-white-2",
  "x-y",
  "omega-ruby-alpha-sapphire",
  "sun-moon",
  "ultra-sun-ultra-moon",
  "lets-go-pikachu-lets-go-eevee",
  "sword-shield",
  "the-isle-of-armor",
  "the-crown-tundra",
  "brilliant-diamond-shining-pearl",
  "legends-arceus",
  "scarlet-violet",
  "the-teal-mask",
  "the-indigo-disk",
  "legends-za",
  "mega-dimension",
  "champions",
];

/** Place of a game in the release order; unknown (new) games count as the newest. */
export function releaseIndex(versionGroup: string): number {
  const index = GAME_ORDER.indexOf(versionGroup);
  return index === -1 ? GAME_ORDER.length : index;
}

/**
 * The PokéAPI sprite keys that show a game's Pokémon, best first. Games
 * without sprites of their own use those of the game they are an add-on to
 * or share their models with.
 */
const SPRITE_KEYS: Record<string, string[]> = {
  "gold-silver": ["gold", "silver"],
  "black-2-white-2": ["black-white"],
  "sun-moon": ["ultra-sun-ultra-moon"],
  "the-isle-of-armor": ["sword-shield"],
  "the-crown-tundra": ["sword-shield"],
  "the-teal-mask": ["scarlet-violet"],
  "the-indigo-disk": ["scarlet-violet"],
};

export function spriteKeys(versionGroup: string): string[] {
  return SPRITE_KEYS[versionGroup] ?? [versionGroup];
}
