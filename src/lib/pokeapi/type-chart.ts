import { POKEMON_TYPES } from "@/lib/pokedex/types";
import type { TypeRelations } from "@/lib/pokedex/matchups";
import type { TypeChartEntry } from "@/lib/pokedex/type-chart";
import { fetchPokeApi, idFromUrl } from "./client";
import { parseTypeChart } from "./detail";

type TypeResponse = TypeRelations & { generation: { url: string } };

/** The 18 types with their chart (now and in the past) and the generation they came in. */
export async function getTypeCharts(): Promise<TypeChartEntry[]> {
  return Promise.all(
    POKEMON_TYPES.map(async (type) => {
      const response = await fetchPokeApi<TypeResponse>(`/type/${type}`);
      return {
        chart: parseTypeChart(response),
        generation: idFromUrl(response.generation.url),
      };
    }),
  );
}
