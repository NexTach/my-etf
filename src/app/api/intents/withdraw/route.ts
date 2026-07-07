import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession } from "@/lib/session";
import { createWithdrawalIntent } from "@/lib/store";

const schema = z.object({
  amountKrw: z.coerce.number().int().min(10000).max(100000000),
  bankName: z.string().min(1).max(30),
  accountNumber: z.string().min(5).max(40),
  accountHolder: z.string().min(1).max(30),
  contact: z.string().min(4).max(80),
  note: z.string().max(500).optional()
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/?error=invalid_withdrawal", request.url), { status: 303 });
  }

  await createWithdrawalIntent({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    amountKrw: parsed.data.amountKrw,
    bankName: parsed.data.bankName,
    accountNumber: parsed.data.accountNumber,
    accountHolder: parsed.data.accountHolder,
    contact: parsed.data.contact,
    note: parsed.data.note
  });

  return NextResponse.redirect(new URL("/?submitted=withdrawal", request.url), { status: 303 });
}
