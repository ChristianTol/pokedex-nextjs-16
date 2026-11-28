import type { MessageKey } from "@/lib/i18n/messages";

/** Base stats top out at 255, which is the full width of a bar. */
export const MAX_BASE_STAT = 255;

export const STAT_LABELS: Record<string, MessageKey> = {
  hp: "stat.hp",
  attack: "stat.attack",
  defense: "stat.defense",
  special: "stat.special",
  "special-attack": "stat.special-attack",
  "special-defense": "stat.special-defense",
  speed: "stat.speed",
};

export const STAT_COLORS: Record<string, string> = {
  hp: "bg-red-500",
  attack: "bg-orange-500",
  defense: "bg-yellow-500",
  special: "bg-blue-500",
  "special-attack": "bg-blue-500",
  "special-defense": "bg-green-500",
  speed: "bg-pink-500",
};

export const STAT_ACCENT_COLORS: Record<string, string> = {
  hp: "#ef4444",
  attack: "#f97316",
  defense: "#eab308",
  special: "#3b82f6",
  "special-attack": "#3b82f6",
  "special-defense": "#22c55e",
  speed: "#ec4899",
};
