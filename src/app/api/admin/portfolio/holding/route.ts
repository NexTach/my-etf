import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { upsertDividendRecord } from "@/lib/dividends";
import { fetchDividendRecordFromMarket } from "@/lib/market-data";
import { upsertManualHolding } from "@/lib/portfolio-store";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  symbol: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  alias: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().max(80).optional()
  ),
  marketCountry: z.enum(["NASDAQ", "NYSE", "AMEX", "KOSPI", "KOSDAQ"]),
  currency: z.enum(["KRW", "USD"]),
  quantity: z.coerce.number().positive(),
  lastPrice: z.coerce.number().positive(),
  averagePurchasePrice: z.coerce.number().nonnegative().optional(),
  purchaseExchangeRate: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(500).max(3000).optional()
  )
});

function normalizeHoldingSymbol(symbol: string, currency: "KRW" | "USD", marketCountry: string) {
  const normalized = symbol.trim().toUpperCase();
  if (currency === "KRW" && marketCountry === "KOSDAQ") {
    return `${normalized.replace(/\.(KS|KQ)$/, "")}.KQ`;
  }
  if (currency === "KRW") return normalized.replace(/\.(KS|KQ)$/, "");
  return normalized;
}

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_holding", request.url), {
      status: 303
    });
  }

  const symbol = normalizeHoldingSymbol(parsed.data.symbol, parsed.data.currency, parsed.data.marketCountry);

  await upsertManualHolding({
    ...parsed.data,
    symbol,
    averagePurchasePrice: parsed.data.averagePurchasePrice || undefined,
    purchaseExchangeRate:
      parsed.data.currency === "USD" ? parsed.data.purchaseExchangeRate || undefined : undefined
  });

  try {
    const dividendRecord = await fetchDividendRecordFromMarket(symbol);
    if (dividendRecord) {
      await upsertDividendRecord(dividendRecord);
    }
  } catch (error) {
    console.error(`Dividend sync failed after holding update: ${symbol}`, error);
  }

  return NextResponse.redirect(new URL("/admin?portfolio=updated", request.url), { status: 303 });
}
