import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { deleteDividendRecord } from "@/lib/dividends";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  symbol: z.string().trim().min(1).max(20)
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_dividend_delete", request.url), {
      status: 303
    });
  }

  await deleteDividendRecord(parsed.data.symbol);
  return NextResponse.redirect(new URL("/admin?dividend=deleted", request.url), { status: 303 });
}
