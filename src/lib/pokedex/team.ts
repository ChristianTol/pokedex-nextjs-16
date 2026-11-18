import type { Matchups } from "./matchups";
import { POKEMON_TYPES } from "./types";

export const MAX_TEAM_SIZE = 6;

/** Species ids of the team, in the order they were added. */
export type Team = readonly number[];

export function addToTeam(team: Team, id: number): number[] {
  if (team.includes(id) || team.length >= MAX_TEAM_SIZE) return [...team];
  return [...team, id];
}

export function removeFromTeam(team: Team, id: number): number[] {
  return team.filter((member) => member !== id);
}

/** Reads the stored JSON; anything malformed is dropped. */
export function parseTeam(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const ids = value.filter(
      (item): item is number =>
        typeof item === "number" && Number.isInteger(item) && item > 0,
    );
    return [...new Set(ids)].slice(0, MAX_TEAM_SIZE);
  } catch {
    return [];
  }
}

export function serializeTeam(team: Team): string {
  return JSON.stringify(team);
}

export type DefenseRow = {
  type: string;
  /** Members that take extra damage from this type. */
  weak: number;
  /** Members that take less damage, or none. */
  resistant: number;
};

/** Per attacking type: how many members are weak to it and how many resist it. */
export function teamDefense(members: readonly Matchups[]): DefenseRow[] {
  return POKEMON_TYPES.map((type) => {
    const multipliers = members.map((member) => member.defense[type] ?? 1);
    return {
      type,
      weak: multipliers.filter((m) => m > 1).length,
      resistant: multipliers.filter((m) => m < 1).length,
    };
  });
}

/** Types the team is weak to: more members are weak to it than resist it. */
export function teamWeaknesses(defense: readonly DefenseRow[]): string[] {
  return defense
    .filter((row) => row.weak > row.resistant)
    .map((row) => row.type);
}

export type OffenseRow = {
  type: string;
  /** Members whose own types hit this type for extra damage. */
  superEffective: number;
};

/** Per defending type: how many members hit it hard with a move of their own type. */
export function teamOffense(members: readonly Matchups[]): OffenseRow[] {
  return POKEMON_TYPES.map((type) => ({
    type,
    superEffective: members.filter((member) => (member.offense[type] ?? 1) > 1)
      .length,
  }));
}

/** Types no member hits for extra damage. */
export function teamCoverageGaps(offense: readonly OffenseRow[]): string[] {
  return offense
    .filter((row) => row.superEffective === 0)
    .map((row) => row.type);
}
