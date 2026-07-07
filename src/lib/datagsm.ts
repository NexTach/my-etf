import { createHash } from "node:crypto";
import type { AppUser, DataGsmUser } from "./types";

const AUTH_BASE = "https://oauth.authorization.datagsm.kr";
const RESOURCE_BASE = "https://oauth.resource.datagsm.kr";

function base64Url(input: Buffer) {
  return input.toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export function createAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const url = new URL("/v1/oauth/authorize", AUTH_BASE);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeDataGsmCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: process.env.DATAGSM_CLIENT_ID ?? "",
    code_verifier: params.codeVerifier
  };

  if (process.env.DATAGSM_CLIENT_SECRET) {
    body.client_secret = process.env.DATAGSM_CLIENT_SECRET;
  }

  const response = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`DataGSM token exchange failed: ${response.status}`);
  }

  const json = await response.json();
  const accessToken = json.access_token ?? json.accessToken;
  if (!accessToken) {
    throw new Error("DataGSM token response did not include an access token");
  }
  return accessToken as string;
}

export async function fetchDataGsmUser(accessToken: string): Promise<DataGsmUser> {
  const response = await fetch(`${RESOURCE_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`DataGSM userinfo failed: ${response.status}`);
  }

  return response.json();
}

function isAlumniRole(role?: string) {
  if (!role) return false;
  return ["ALUMNI", "GRADUATE", "GRADUATED_STUDENT"].some((keyword) =>
    role.toUpperCase().includes(keyword)
  );
}

export function toEligibleAppUser(user: DataGsmUser): AppUser | null {
  const student = user.student;
  const isActiveStudent = Boolean(user.isStudent && student && student.isLeaveSchool !== true);
  const isAlumni = isAlumniRole(user.role) || isAlumniRole(student?.role);

  if (!isActiveStudent && !isAlumni) {
    return null;
  }

  return {
    id: String(user.id),
    email: user.email,
    name: student?.name ?? user.email.split("@")[0],
    role: student?.role ?? user.role,
    studentNumber: student?.studentNumber,
    userType: isAlumni ? "alumni" : "student"
  };
}
