import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/market-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const results = await searchSymbols(query);
  return NextResponse.json({ results });
}
