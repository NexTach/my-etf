import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { deleteDisclosure } from "@/lib/disclosures";
import { getUserSession } from "@/lib/session";

const schema = z.object({
  id: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const user = await getUserSession();
  if (!isAdminUser(user)) return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });

  const parsed = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/admin?error=invalid_disclosure_delete", request.url), { status: 303 });
  }

  await deleteDisclosure(parsed.data.id);
  return NextResponse.redirect(new URL("/admin?disclosure=deleted", request.url), { status: 303 });
}
