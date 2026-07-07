import { NextResponse } from "next/server";
import { isProduction } from "@/lib/env";
import { setUserSession } from "@/lib/session";

export async function POST(request: Request) {
  if (isProduction() || process.env.ENABLE_DEV_LOGIN === "false") {
    return NextResponse.json({ message: "Dev login is disabled" }, { status: 404 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") || "개발 사용자");
  await setUserSession({
    id: "dev-user",
    email: "student@gsm.hs.kr",
    name,
    role: "GENERAL_STUDENT",
    studentNumber: 1101,
    userType: "student"
  });

  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
