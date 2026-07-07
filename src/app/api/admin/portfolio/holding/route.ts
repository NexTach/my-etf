import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { upsertManualHolding } from "@/lib/portfolio-store";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  symbol: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  marketCountry: z.enum(["KR", "US"]),
  currency: z.enum(["KRW", "USD"]),
  quantity: z.coerce.number().positive(),
  lastPrice: z.coerce.number().positive(),
  averagePurchasePrice: z.coerce.number().nonnegative().optional(),
  profitLossRate: z.coerce.number().optional()
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_holding", request.url), {
      status: 303
    });
  }

  await upsertManualHolding({
    ...parsed.data,
    symbol: parsed.data.symbol.toUpperCase(),
    averagePurchasePrice: parsed.data.averagePurchasePrice || undefined,
    profitLossRate:
      typeof parsed.data.profitLossRate === "number"
        ? parsed.data.profitLossRate / 100
        : undefined
  });

  return NextResponse.redirect(new URL("/admin?portfolio=updated", request.url), { status: 303 });
}
