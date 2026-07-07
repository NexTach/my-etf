import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { upsertDividendRecord } from "@/lib/dividends";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  symbol: z.string().trim().min(1).max(20),
  currency: z.enum(["KRW", "USD"]),
  annualDividendPerShare: z.coerce.number().min(0),
  trailingYield: z.coerce.number().min(0).optional(),
  expectedPaymentMonths: z.string().min(1).max(80),
  lastDividendPerShare: z.coerce.number().min(0).optional(),
  memo: z.string().max(500).optional()
});

function parseMonths(value: string) {
  return value
    .split(",")
    .map((month) => Number(month.trim()))
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
}

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_dividend", request.url), {
      status: 303
    });
  }

  const expectedPaymentMonths = parseMonths(parsed.data.expectedPaymentMonths);
  if (expectedPaymentMonths.length === 0) {
    return NextResponse.redirect(new URL("/admin?error=invalid_dividend_months", request.url), {
      status: 303
    });
  }

  await upsertDividendRecord({
    symbol: parsed.data.symbol.toUpperCase(),
    currency: parsed.data.currency,
    annualDividendPerShare: parsed.data.annualDividendPerShare,
    trailingYield:
      typeof parsed.data.trailingYield === "number" ? parsed.data.trailingYield / 100 : undefined,
    expectedPaymentMonths,
    lastDividendPerShare: parsed.data.lastDividendPerShare,
    memo: parsed.data.memo
  });

  return NextResponse.redirect(new URL("/admin?dividend=updated", request.url), { status: 303 });
}
