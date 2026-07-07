import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthorizeUrl, createCodeChallenge } from "@/lib/datagsm";
import { randomToken } from "@/lib/session";

export async function GET() {
  const clientId = process.env.DATAGSM_CLIENT_ID;
  const redirectUri = process.env.DATAGSM_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/login?error=datagsm_not_configured", "http://localhost:3000"));
  }

  const state = randomToken();
  const codeVerifier = randomToken();
  const cookieStore = await cookies();
  cookieStore.set("datagsm_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5,
    path: "/"
  });
  cookieStore.set("datagsm_code_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5,
    path: "/"
  });

  const url = createAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: createCodeChallenge(codeVerifier)
  });

  return NextResponse.redirect(url);
}
