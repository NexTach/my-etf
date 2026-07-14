import type { Metadata } from "next";
import { ToastStack } from "@/app/components/toast";
import { FUND_DESCRIPTION, FUND_KOREAN_NAME, FUND_NAME, FUND_TICKER } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: FUND_NAME,
  title: FUND_NAME,
  description: FUND_DESCRIPTION,
  keywords: [FUND_TICKER, FUND_KOREAN_NAME, "글로벌 배당", "월배당", "인컴 포트폴리오"]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <ToastStack messages={[]} listenForRuntime />
      </body>
    </html>
  );
}
