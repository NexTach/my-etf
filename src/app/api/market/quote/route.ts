import { NextResponse } from "next/server";
import { fetchMarketQuote } from "@/lib/market-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? "";
  const quote = await fetchMarketQuote(symbol);

  if (!quote) {
    return NextResponse.json({ quote: null }, { status: 404 });
  }

  return NextResponse.json({ quote });
}
