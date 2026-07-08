import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { fetchDividendRecordFromMarket } from "@/lib/market-data";
import { adminErrorFlash, adminSuccessFlash, redirectWithFlash } from "@/lib/flash";
import { getUserSession } from "@/lib/session";
import { upsertDividendRecord } from "@/lib/dividends";

const schema = z.object({
  symbol: z.string().trim().min(1).max(20)
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_dividend_sync"));
  }

  const record = await fetchDividendRecordFromMarket(parsed.data.symbol);
  if (!record) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("dividend_sync_failed"));
  }

  await upsertDividendRecord(record);
  return redirectWithFlash(request, "/admin", adminSuccessFlash("dividend", "synced"));
}
