import { NextResponse } from "next/server";
import { getPokemonSprites } from "@/lib/pokeapi/detail";

const MAX_IDS = 50;

export async function GET(request: Request) {
  const values = new URL(request.url).searchParams.get("ids");
  if (!values) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const ids = values.split(",");
  if (
    ids.length > MAX_IDS ||
    ids.some((id) => !/^\d{1,6}$/.test(id) || Number(id) < 1)
  ) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  return NextResponse.json(
    await getPokemonSprites([...new Set(ids.map(Number))]),
  );
}