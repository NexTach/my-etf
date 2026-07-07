import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GSM Portfolio Intent",
  description: "DataGSM OAuth gated portfolio and investment intent service"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
