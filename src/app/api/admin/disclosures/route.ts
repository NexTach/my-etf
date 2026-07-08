import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { upsertDisclosure } from "@/lib/disclosures";
import { adminErrorFlash, adminSuccessFlash, redirectWithFlash } from "@/lib/flash";
import { getUserSession } from "@/lib/session";

const sideSchema = z.enum(["BUY", "SELL"]);
const marketSchema = z.enum(["NASDAQ", "NYSE", "AMEX", "KOSPI", "KOSDAQ"]);
const currencySchema = z.enum(["KRW", "USD"]);

const tradeSchema = z.object({
  side: sideSchema,
  symbol: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  alias: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().max(80).optional()),
  marketCountry: marketSchema,
  currency: currencySchema,
  quantity: z.coerce.number().positive(),
  orderPrice: z.coerce.number().positive(),
  exchangeRate: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().min(500).max(3000).optional()
  ),
  profitRate: z.coerce.number(),
  feeKrw: z.coerce.number().int().nonnegative(),
  taxKrw: z.coerce.number().int().nonnegative(),
  orderedAt: z.string().trim().min(1)
}).superRefine((trade, context) => {
  if (trade.currency === "USD" && typeof trade.exchangeRate !== "number") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "USD 거래는 기준환율이 필요합니다.",
      path: ["exchangeRate"]
    });
  }
});

const schema = z.object({
  id: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().optional()),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(10000),
  tradesJson: z.string().default("[]")
});

function parseTrades(value: string) {
  try {
    const json = JSON.parse(value);
    return z.array(tradeSchema).max(20).parse(json);
  } catch {
    return null;
  }
}

function parseOrderedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_disclosure"));
  }

  const trades = parseTrades(parsed.data.tradesJson);
  if (!trades) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_disclosure_trade"));
  }

  const normalizedTrades = [];
  for (const trade of trades) {
    const orderedAt = parseOrderedAt(trade.orderedAt);
    if (!orderedAt) {
      return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_disclosure_trade"));
    }

    normalizedTrades.push({
      ...trade,
      symbol: trade.symbol.toUpperCase(),
      alias: trade.alias || undefined,
      exchangeRate: trade.currency === "USD" ? trade.exchangeRate : undefined,
      profitRate: trade.profitRate / 100,
      orderedAt
    });
  }

  await upsertDisclosure({
    id: parsed.data.id,
    title: parsed.data.title,
    body: parsed.data.body,
    trades: normalizedTrades
  });

  return redirectWithFlash(
    request,
    "/admin",
    adminSuccessFlash("disclosure", parsed.data.id ? "updated" : "created")
  );
}
