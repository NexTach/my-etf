"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { PolicyMarkdown } from "@/app/components/policy-markdown";

export function TermsAgreement({
  markdown,
  disabled = false,
  name = "termsAgreed",
  title = "투자에 관한 주의 사항 및 상품 설명",
  label = "을 숙지하였고 이에 동의합니다.",
  modalDescription = "의향서 제출 전 확인해야 하는 원문입니다."
}: {
  markdown: string;
  disabled?: boolean;
  name?: string;
  title?: string;
  label?: string;
  modalDescription?: string;
}) {
  const [open, setOpen] = useState(false);
  const checkboxId = useId();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="terms-agreement">
        <input
          disabled={disabled}
          id={checkboxId}
          name={name}
          required={!disabled}
          type="checkbox"
          value="true"
        />
        <span>
          <button className="terms-link" type="button" onClick={() => setOpen(true)}>
            {title}
          </button>
          <label htmlFor={checkboxId}>{label}</label>
        </span>
      </div>

      {open ? (
        <div className="terms-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="terms-modal"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="terms-modal-header">
              <div>
                <h2 id={titleId}>{title}</h2>
                <p>{modalDescription}</p>
              </div>
              <button
                ref={closeButtonRef}
                aria-label="닫기"
                className="terms-modal-close ghost"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="terms-modal-content markdown-body">
              <PolicyMarkdown markdown={markdown} />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
