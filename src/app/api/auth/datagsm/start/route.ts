import { NextRequest, NextResponse } from "next/server";
import { createAuthorizeUrl, createCodeChallenge } from "@/lib/datagsm";
import { authErrorFlash, redirectWithFlash } from "@/lib/flash";
import { randomToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const clientId = process.env.DATAGSM_CLIENT_ID;
  const requestUrl = new URL(request.url);
  const redirectUri = process.env.DATAGSM_REDIRECT_URI ?? `${requestUrl.origin}/api/auth/datagsm/callback`;

  if (!clientId || !redirectUri) {
    return redirectWithFlash(request, "/", authErrorFlash("datagsm_not_configured"), 307);
  }

  if (new URL(redirectUri).origin !== requestUrl.origin) {
    return redirectWithFlash(request, "/", authErrorFlash("oauth_origin"), 307);
  }

  const state = randomToken();
  const codeVerifier = randomToken();
  const url = createAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: createCodeChallenge(codeVerifier)
  });
  const response = NextResponse.redirect(url);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: requestUrl.protocol === "https:",
    maxAge: 60 * 5,
    path: "/"
  };

  response.cookies.set("datagsm_oauth_state", state, cookieOptions);
  response.cookies.set("datagsm_code_verifier", codeVerifier, cookieOptions);

  return response;
}
