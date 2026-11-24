import { NextResponse } from "next/server";
import { getTypeCharts } from "@/lib/pokeapi/type-chart";
import { NEWEST_GENERATION, typeTable } from "@/lib/pokedex/type-chart";

/** The current type chart: damage multiplier per attacking and defending type. */
export async function GET() {
  try {
    return NextResponse.json(
      typeTable(await getTypeCharts(), NEWEST_GENERATION),
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load the type chart" },
      { status: 502 },
    );
  }
}
