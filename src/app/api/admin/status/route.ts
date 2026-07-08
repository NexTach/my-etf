import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { adminErrorFlash, adminSuccessFlash, redirectWithFlash } from "@/lib/flash";
import { getUserSession } from "@/lib/session";
import { updateIntentStatus } from "@/lib/store";

const schema = z.object({
  type: z.enum(["INVESTMENT", "WITHDRAWAL"]),
  id: z.string().cuid(),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED"])
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_status"));
  }

  await updateIntentStatus(parsed.data);
  return redirectWithFlash(request, "/admin", adminSuccessFlash("updated"));
}
