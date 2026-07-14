"use client";

import { ToastStack } from "@/app/components/toast";
import { AppShell, CtaPanel, Navigation, Top } from "@/app/components/tds";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <ToastStack messages={[{
        id: `server-read-error-${error.digest ?? "unknown"}`,
        title: "서버 데이터를 불러오지 못했습니다",
        description: "연결 상태를 확인한 뒤 다시 시도해 주세요.",
        tone: "error"
      }]} />
      <Navigation />
      <Top
        title="데이터를 불러오지 못했어요"
        description="화면을 이동하지 않고 서버 연결을 다시 시도할 수 있습니다."
      />
      <CtaPanel>
        <button type="button" onClick={reset}>다시 시도</button>
      </CtaPanel>
    </AppShell>
  );
}
