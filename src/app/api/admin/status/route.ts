import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { getUserSession } from "@/lib/session";
import { updateIntentStatus } from "@/lib/store";

const schema = z.object({
  type: z.enum(["INVESTMENT", "WITHDRAWAL"]),
  id: z.string().uuid(),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED"])
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_status", request.url), {
      status: 303
    });
  }

  await updateIntentStatus(parsed.data);
  return NextResponse.redirect(new URL("/admin?updated=1", request.url), { status: 303 });
}
