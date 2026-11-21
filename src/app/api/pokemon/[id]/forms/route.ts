import { NextResponse } from "next/server";
import { PokeApiError } from "@/lib/pokeapi/client";
import { getPokemonFormSprites } from "@/lib/pokeapi/detail";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,5}$/.test(id) || Number(id) < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getPokemonFormSprites(Number(id)));
  } catch (error) {
    if (error instanceof PokeApiError && error.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Could not load Pokémon forms" },
      { status: 502 },
    );
  }
}