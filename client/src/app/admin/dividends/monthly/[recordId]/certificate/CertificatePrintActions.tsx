"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function CertificatePrintActions() {
  const didRequestPrint = useRef(false);

  useEffect(() => {
    if (didRequestPrint.current) return;
    didRequestPrint.current = true;

    const printTimer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(printTimer);
  }, []);

  return (
    <nav aria-label="확인서 작업" className="certificate-actions">
      <Link className="button ghost" href="/admin#admin-monthly-dividends">
        <ArrowLeft aria-hidden="true" size={16} />
        관리자 화면
      </Link>
      <button type="button" onClick={() => window.print()}>
        <Printer aria-hidden="true" size={16} />
        인쇄 또는 PDF 저장
      </button>
    </nav>
  );
}
