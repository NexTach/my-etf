import type { AppUser } from "./types";

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: AppUser | null) {
  if (!user) return false;
  return adminEmails().includes(user.email.toLowerCase());
}
