import { cookies } from "next/headers";

export const FLASH_COOKIE_NAME = "nxdi_flash";

export type FlashMessage = {
  id: string;
  title: string;
  description?: string;
  tone?: "success" | "error" | "info";
};

function decodeFlash(value?: string) {
  if (!value) return null;

  try {
    const message = JSON.parse(Buffer.from(value, "base64url").toString()) as FlashMessage;
    if (!message || typeof message.id !== "string" || typeof message.title !== "string") return null;
    return message;
  } catch {
    return null;
  }
}

export async function getFlashMessages() {
  const cookieStore = await cookies();
  const message = decodeFlash(cookieStore.get(FLASH_COOKIE_NAME)?.value);
  return message ? [message] : [];
}
