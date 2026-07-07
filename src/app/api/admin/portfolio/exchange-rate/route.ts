import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { updateManualExchangeRate } from "@/lib/portfolio-store";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  exchangeRate: z.coerce.number().min(500).max(3000)
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_exchange_rate", request.url), {
      status: 303
    });
  }

  await updateManualExchangeRate(parsed.data.exchangeRate);
  return NextResponse.redirect(new URL("/admin?portfolio=exchange_rate", request.url), {
    status: 303
  });
}
