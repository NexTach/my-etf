"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  tone?: "success" | "error" | "info";
};

export const TOAST_EVENT_NAME = "nxdi:toast";

export function showToast(message: ToastMessage) {
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT_NAME, { detail: message }));
}

function ToastIcon({ tone }: { tone: NonNullable<ToastMessage["tone"]> }) {
  if (tone === "error") return <AlertCircle size={18} />;
  if (tone === "success") return <CheckCircle2 size={18} />;
  return <Info size={18} />;
}

function ToastItem({ message }: { message: ToastMessage }) {
  const [isVisible, setIsVisible] = useState(true);
  const tone = message.tone ?? "info";

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(false), 5200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`tds-toast ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="tds-toast-icon" aria-hidden="true">
        <ToastIcon tone={tone} />
      </span>
      <div className="tds-toast-content">
        <strong>{message.title}</strong>
        {message.description ? <p>{message.description}</p> : null}
      </div>
      <button className="tds-toast-close" type="button" title="알림 닫기" onClick={() => setIsVisible(false)}>
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastStack({
  messages,
  clearCookieName,
  listenForRuntime = false
}: {
  messages: ToastMessage[];
  clearCookieName?: string;
  listenForRuntime?: boolean;
}) {
  const [runtimeMessages, setRuntimeMessages] = useState<ToastMessage[]>([]);
  const visibleMessages = [...messages.filter(Boolean), ...runtimeMessages];

  useEffect(() => {
    if (!listenForRuntime) return;

    let sequence = 0;
    const receiveToast = (event: Event) => {
      const message = (event as CustomEvent<ToastMessage>).detail;
      if (!message || typeof message.title !== "string") return;
      sequence += 1;
      setRuntimeMessages((current) => [
        ...current.slice(-4),
        { ...message, id: `${message.id}-${Date.now()}-${sequence}` }
      ]);
    };

    window.addEventListener(TOAST_EVENT_NAME, receiveToast);
    return () => window.removeEventListener(TOAST_EVENT_NAME, receiveToast);
  }, [listenForRuntime]);

  useEffect(() => {
    if (!clearCookieName || visibleMessages.length === 0) return;
    document.cookie = `${clearCookieName}=; Max-Age=0; path=/; SameSite=Lax`;
  }, [clearCookieName, visibleMessages.length]);

  if (visibleMessages.length === 0) return null;

  return (
    <div className="tds-toast-stack" aria-live="polite">
      {visibleMessages.map((message) => (
        <ToastItem key={message.id} message={message} />
      ))}
    </div>
  );
}
