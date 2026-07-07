import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/market-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  try {
    const results = await searchSymbols(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(`Market search failed: ${query}`, error);
    return NextResponse.json({ results: [] });
  }
}
