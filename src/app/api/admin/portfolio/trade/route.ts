import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { applyManualHoldingTrade } from "@/lib/portfolio-store";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  tradeSymbol: z.string().trim().min(1).max(20),
  side: z.enum(["BUY", "SELL"]),
  tradeQuantity: z.coerce.number().positive(),
  orderPrice: z.coerce.number().positive(),
  exchangeRate: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(500).max(3000).optional()
  )
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_trade", request.url), {
      status: 303
    });
  }

  const result = await applyManualHoldingTrade({
    symbol: parsed.data.tradeSymbol,
    side: parsed.data.side,
    quantity: parsed.data.tradeQuantity,
    orderPrice: parsed.data.orderPrice,
    exchangeRate: parsed.data.exchangeRate
  });

  if (result.status === "not_found") {
    return NextResponse.redirect(new URL("/admin?error=trade_not_found", request.url), { status: 303 });
  }

  if (result.status === "insufficient_quantity") {
    return NextResponse.redirect(new URL("/admin?error=trade_insufficient", request.url), { status: 303 });
  }

  return NextResponse.redirect(new URL("/admin?portfolio=traded", request.url), { status: 303 });
}
