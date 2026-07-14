import { createHash } from "node:crypto";
import type { AppUser, DataGsmUser } from "../domain/types.js";
import { fetchExternal } from "./external-http.js";

const AUTH_BASE = "https://oauth.authorization.datagsm.kr";
const RESOURCE_BASE = "https://oauth.resource.datagsm.kr";

export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string; codeChallenge: string }) {
  const url = new URL("/v1/oauth/authorize", AUTH_BASE);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeDataGsmCode(params: { code: string; codeVerifier: string; redirectUri: string }) {
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: process.env.DATAGSM_CLIENT_ID ?? "",
    code_verifier: params.codeVerifier
  };
  if (process.env.DATAGSM_CLIENT_SECRET) body.client_secret = process.env.DATAGSM_CLIENT_SECRET;
  const response = await fetchExternal(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, { timeoutMs: 8000, retries: 1 });
  if (!response.ok) throw new Error(`DataGSM token exchange failed: ${response.status}`);
  const json = await response.json() as { access_token?: string; accessToken?: string };
  const token = json.access_token ?? json.accessToken;
  if (!token) throw new Error("DataGSM token response did not include an access token");
  return token;
}

export async function fetchDataGsmUser(accessToken: string): Promise<DataGsmUser> {
  const response = await fetchExternal(`${RESOURCE_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  }, { timeoutMs: 8000, retries: 1 });
  if (!response.ok) throw new Error(`DataGSM userinfo failed: ${response.status}`);
  return response.json() as Promise<DataGsmUser>;
}

function isAlumniRole(role?: string) {
  return Boolean(role && ["ALUMNI", "GRADUATE", "GRADUATED_STUDENT"].some((word) => role.toUpperCase().includes(word)));
}

export function toEligibleAppUser(user: DataGsmUser): AppUser | null {
  const student = user.student;
  const active = Boolean(user.isStudent && student && student.isLeaveSchool !== true);
  const alumni = isAlumniRole(user.role) || isAlumniRole(student?.role);
  if (!active && !alumni) return null;
  return {
    id: String(user.id),
    email: user.email,
    name: student?.name ?? user.email.split("@")[0]!,
    role: student?.role ?? user.role,
    studentNumber: student?.studentNumber,
    userType: alumni ? "alumni" : "student"
  };
}
