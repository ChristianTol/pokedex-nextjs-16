import { NextResponse } from "next/server";
import { PokeApiError } from "@/lib/pokeapi/client";
import { getPokemonDetail } from "@/lib/pokeapi/detail";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d{1,5}$/.test(id) || Number(id) < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const form = new URL(request.url).searchParams.get("form");
  if (form !== null && !/^\d{1,6}$/.test(form)) {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await getPokemonDetail(
        Number(id),
        form === null ? undefined : Number(form),
      ),
    );
  } catch (error) {
    if (error instanceof PokeApiError && error.status === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Could not load Pokémon" },
      { status: 502 },
    );
  }
}
