import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { deleteDividendRecord } from "@/lib/dividends";
import { adminErrorFlash, adminSuccessFlash, redirectWithFlash } from "@/lib/flash";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  symbol: z.string().trim().min(1).max(20)
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_dividend_delete"));
  }

  await deleteDividendRecord(parsed.data.symbol);
  return redirectWithFlash(request, "/admin", adminSuccessFlash("dividend", "deleted"));
}
