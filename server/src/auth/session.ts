import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppUser } from "../domain/types.js";

export const USER_COOKIE = "nxdi_session";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function sessionSecret() {
  const configured = process.env.APP_SESSION_SECRET;
  if (configured) return configured;
  throw new Error("APP_SESSION_SECRET is required");
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function encodeSession(user: AppUser, now = Date.now()) {
  const value = { user, expiresAt: now + ONE_WEEK_SECONDS * 1000 };
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token?: string): AppUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      user?: AppUser;
      expiresAt?: number;
    };
    if (!parsed.user || !parsed.expiresAt || parsed.expiresAt <= Date.now()) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

export function requestUser(request: FastifyRequest) {
  return decodeSession(request.cookies[USER_COOKIE]);
}

export function setUserSession(reply: FastifyReply, user: AppUser) {
  reply.setCookie(USER_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_WEEK_SECONDS,
    path: "/"
  });
}

export function clearUserSession(reply: FastifyReply) {
  reply.clearCookie(USER_COOKIE, { path: "/" });
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}
