import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DisclosureTradeDetails } from "@/app/components/disclosure-trades";
import {
  AppShell,
  ButtonLink,
  Navigation,
  Notice,
  Panel,
  SectionHeader,
  Top
} from "@/app/components/tds";
import { readDisclosure } from "@/lib/disclosures";
import { formatDateTime } from "@/lib/format";
import { getUserSession } from "@/lib/session";

type DisclosureDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: DisclosureDetailProps): Promise<Metadata> {
  const { id } = await params;
  const disclosure = await readDisclosure(id);

  return {
    title: disclosure ? `${disclosure.title} | T-ETF 공시` : "공시 | T-ETF",
    description: disclosure?.body.slice(0, 120) ?? "T-ETF 공시 상세"
  };
}

export default async function DisclosureDetailPage({ params }: DisclosureDetailProps) {
  const user = await getUserSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const disclosure = await readDisclosure(id);
  if (!disclosure) notFound();

  return (
    <AppShell>
      <Navigation
        title="T-ETF 공시"
        description={`${user.name} · 공시 상세`}
        actions={
          <>
            <ButtonLink href="/disclosures" variant="secondary">
              공시 목록
            </ButtonLink>
            <form action="/api/auth/logout" method="post">
              <button className="ghost" type="submit" title="로그아웃">
                <LogOut size={18} />
              </button>
            </form>
          </>
        }
      />

      <Top
        backLink={{ href: "/disclosures", label: "공시 목록" }}
        title={disclosure.title}
        description={`등록 ${formatDateTime(disclosure.createdAt)} · 수정 ${formatDateTime(disclosure.updatedAt)}`}
      />

      <Panel className="disclosure-detail-panel">
        <article className="disclosure-body">{disclosure.body}</article>
      </Panel>

      {disclosure.trades.length > 0 ? (
        <>
          <SectionHeader title="첨부 거래 이력" description="거래별 세부 조건입니다." />
          <DisclosureTradeDetails trades={disclosure.trades} />
        </>
      ) : null}

      <Notice className="mt-18">
        공시 내용은 운용 기록 안내이며, 표시된 거래 조건은 실제 체결·정산 조건과 차이가 있을 수 있습니다.
      </Notice>
    </AppShell>
  );
}
