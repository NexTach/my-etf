import type { AppUser } from "../domain/types.js";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: AppUser | null) {
  return Boolean(user && adminEmails().includes(user.email.toLowerCase()));
}
