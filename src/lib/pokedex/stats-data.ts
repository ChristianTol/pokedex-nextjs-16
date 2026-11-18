import file from "@/data/pokemon-stats.json";
import { decodeIndex, type StatsIndexFile } from "./stats-index";

/**
 * Stats and special kind of every Pokémon in the index, by species id. Built
 * by `npm run build:index`; newer Pokémon are missing until it is run again.
 */
export const STATS_INDEX = decodeIndex(file as unknown as StatsIndexFile);
