import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { deleteDisclosure } from "@/lib/disclosures";
import { adminErrorFlash, adminSuccessFlash, redirectWithFlash } from "@/lib/flash";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  id: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return redirectWithFlash(request, "/admin", adminErrorFlash("invalid_disclosure_delete"));
  }

  await deleteDisclosure(parsed.data.id);
  return redirectWithFlash(request, "/admin", adminSuccessFlash("disclosure", "deleted"));
}
