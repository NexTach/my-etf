import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { upsertMonthlyDividendRecord } from "@/lib/dividends";
import { adminErrorFlash, adminSuccessFlash, redirectWithFlash } from "@/lib/flash";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  dividendMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  actualDividendKrw: z.coerce.number().min(0),
  referenceMarketValueKrw: z.coerce.number().positive(),
  memo: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().max(500).optional()
  )
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_monthly_dividend"));
  }

  await upsertMonthlyDividendRecord(parsed.data);
  return redirectWithFlash(request, "/admin", adminSuccessFlash("monthlyDividend", "updated"));
}
