import { NextResponse } from "next/server";
import { getPokemonSummary } from "@/lib/pokeapi/summary";
import { parseIdList } from "@/lib/pokedex/ids";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = parseIdList(params.get("ids"));
  const withNames = params.get("names") === "1";
  if (!ids) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await Promise.all(ids.map((id) => getPokemonSummary(id, withNames))),
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load Pokémon" },
      { status: 502 },
    );
  }
}
