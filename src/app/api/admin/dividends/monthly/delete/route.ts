import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { deleteMonthlyDividendRecord } from "@/lib/dividends";
import { adminErrorFlash, adminSuccessFlash, redirectWithFlash } from "@/lib/flash";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  dividendMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_monthly_dividend_delete"));
  }

  await deleteMonthlyDividendRecord(parsed.data.dividendMonth);
  return redirectWithFlash(request, "/admin", adminSuccessFlash("monthlyDividend", "deleted"));
}
