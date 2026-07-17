import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { AuthNavActions } from "@/app/components/auth-actions";
import { IntentLink } from "@/app/components/intent-link";
import { PolicyMarkdown } from "@/app/components/policy-markdown";
import {
  AppShell,
  ButtonLink,
  Navigation,
  Panel,
  Top
} from "@/app/components/tds";
import { getSession } from "@/lib/api";

export const metadata: Metadata = {
  title: "상품 설명 | NXDI",
  description: "NXDI의 운용 개요, 배당 배분 계산 방식과 주요 위험을 안내합니다."
};

async function readProductDescription() {
  const filePath = path.join(process.cwd(), "content", "product-description.md");
  return fs.readFile(filePath, "utf8");
}

export default async function ProductPage() {
  const [{ user }, markdown] = await Promise.all([getSession(), readProductDescription()]);

  return (
    <AppShell>
      <Navigation
        actions={<AuthNavActions user={user} />}
      />

      <Top
        backLink={{ href: "/", label: "포트폴리오" }}
        title="상품 설명"
        actions={
          <>
            <ButtonLink href="/dividend-policy" variant="secondary">
              배당 정책
            </ButtonLink>
            <IntentLink signedIn={Boolean(user)} />
          </>
        }
      />

      <Panel className="markdown-panel">
        <article className="markdown-body">
          <PolicyMarkdown markdown={markdown} />
        </article>
      </Panel>
    </AppShell>
  );
}
