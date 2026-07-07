import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { fetchDividendRecordFromMarket } from "@/lib/market-data";
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
    return NextResponse.redirect(new URL("/admin?error=invalid_dividend_sync", request.url), {
      status: 303
    });
  }

  const record = await fetchDividendRecordFromMarket(parsed.data.symbol);
  if (!record) {
    return NextResponse.redirect(new URL("/admin?error=dividend_sync_failed", request.url), {
      status: 303
    });
  }

  await upsertDividendRecord(record);
  return NextResponse.redirect(new URL("/admin?dividend=synced", request.url), { status: 303 });
}
