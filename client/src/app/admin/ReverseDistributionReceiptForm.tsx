"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ApiMutationForm } from "@/app/components/api-mutation-form";
import { Field } from "@/app/components/tds";
import { formatKrw } from "@/lib/format";

export function ReverseDistributionReceiptForm({
  receiptId,
  statementReference,
  symbol,
  netAmountKrw
}: {
  receiptId: string;
  statementReference: string;
  symbol: string;
  netAmountKrw: number;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const reasonId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;

    reasonRef.current?.focus();
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
      <button
        aria-haspopup="dialog"
        className="secondary distribution-receipt-reversal-trigger"
        type="button"
        onClick={() => setOpen(true)}
      >
        반대분개
      </button>

      {open ? (
        <div
          className="holding-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="holding-modal distribution-receipt-reversal-modal"
            role="dialog"
          >
            <header className="holding-modal-header">
              <div>
                <h3 id={titleId}>실분배금 반대분개</h3>
                <p>원본 기록은 보존하고 동일 금액의 반대 원장을 추가합니다.</p>
              </div>
              <button
                aria-label="닫기"
                className="ghost holding-modal-close"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <ApiMutationForm
              action="/api/admin/dividends/receipt/reverse"
              className="form holding-modal-form"
              method="post"
              onSuccess={() => setOpen(false)}
            >
              <input name="receiptId" type="hidden" value={receiptId} />

              <dl className="distribution-receipt-reversal-summary">
                <div>
                  <dt>종목</dt>
                  <dd>{symbol}</dd>
                </div>
                <div>
                  <dt>반대분개 금액</dt>
                  <dd>-{formatKrw(netAmountKrw)}</dd>
                </div>
                <div className="reference">
                  <dt>내부 원장 ID</dt>
                  <dd>{statementReference}</dd>
                </div>
              </dl>

              <Field htmlFor={reasonId} label="오류 정정 사유" wide>
                <textarea
                  id={reasonId}
                  maxLength={500}
                  name="reason"
                  placeholder="잘못 기록된 내용과 정정 사유를 입력해주세요."
                  ref={reasonRef}
                  required
                  rows={4}
                />
              </Field>

              <footer className="holding-modal-actions distribution-receipt-reversal-actions">
                <span className="field-help">완료된 월 정산에 포함된 원장은 반대분개할 수 없습니다.</span>
                <div className="holding-modal-buttons">
                  <button className="secondary" type="button" onClick={() => setOpen(false)}>
                    취소
                  </button>
                  <button className="distribution-receipt-reversal-confirm" type="submit">
                    반대분개 기록
                  </button>
                </div>
              </footer>
            </ApiMutationForm>
          </section>
        </div>
      ) : null}
    </>
  );
}
