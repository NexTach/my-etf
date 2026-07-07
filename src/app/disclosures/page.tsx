import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DisclosureTradeSummary } from "@/app/components/disclosure-trades";
import {
  AppShell,
  Empty,
  List,
  ListRow,
  Navigation,
  RowMeta,
  TextLink,
  Top
} from "@/app/components/tds";
import { readDisclosures } from "@/lib/disclosures";
import { formatDateTime } from "@/lib/format";
import { getUserSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "공시 | T-ETF",
  description: "T-ETF 공시 목록"
};

export default async function DisclosuresPage() {
  const user = await getUserSession();
  if (!user) redirect("/login");

  const disclosures = await readDisclosures();

  return (
    <AppShell>
      <Navigation
        title="T-ETF 공시"
        description={`${user.name} · 공시 목록`}
        actions={
          <form action="/api/auth/logout" method="post">
            <button className="ghost" type="submit" title="로그아웃">
              <LogOut size={18} />
            </button>
          </form>
        }
      />

      <Top
        backLink={{ href: "/", label: "포트폴리오" }}
        title="공시"
        description="운영 증자, 포트폴리오 변경, 매수·매도 이력을 확인할 수 있습니다."
      />

      {disclosures.length > 0 ? (
        <List className="disclosure-list">
          {disclosures.map((disclosure) => (
            <ListRow
              key={disclosure.id}
              title={<TextLink href={`/disclosures/${disclosure.id}`}>{disclosure.title}</TextLink>}
              description={disclosure.body.slice(0, 100) + (disclosure.body.length > 100 ? "..." : "")}
              value={<TextLink href={`/disclosures/${disclosure.id}`}>상세</TextLink>}
            >
              <RowMeta>{formatDateTime(disclosure.createdAt)}</RowMeta>
              <DisclosureTradeSummary trades={disclosure.trades} />
            </ListRow>
          ))}
        </List>
      ) : (
        <Empty>등록된 공시가 없습니다.</Empty>
      )}
    </AppShell>
  );
}
