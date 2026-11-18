import { NextResponse } from "next/server";
import { PokeApiError } from "@/lib/pokeapi/client";
import { getPokemonMoves } from "@/lib/pokeapi/moves";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,5}$/.test(id) || Number(id) < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const search = new URL(request.url).searchParams;
  const form = search.get("form");
  const game = search.get("game");
  if (form !== null && !/^\d{1,6}$/.test(form)) {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }
  if (game !== null && !/^[a-z0-9-]{1,60}$/.test(game)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await getPokemonMoves(
        Number(id),
        form === null ? undefined : Number(form),
        game ?? undefined,
      ),
    );
  } catch (error) {
    if (error instanceof PokeApiError && error.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Could not load moves" },
      { status: 502 },
    );
  }
}
