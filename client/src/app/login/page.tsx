import { DataGsmLoginButton, AuthNavActions } from "@/app/components/auth-actions";
import { AppShell, ButtonLink, CtaPanel, Navigation, Top } from "@/app/components/tds";
import { getSession } from "@/lib/api";

export default async function LoginPage() {
  const { user } = await getSession();

  return (
    <AppShell>
      <Navigation actions={<AuthNavActions user={user} />} />

      <Top
        title="DataGSM 로그인"
        description="투자 의향서 작성과 제출 내역 확인은 DataGSM 인증 후 이용할 수 있습니다."
        backLink={{ href: "/" }}
      />

      <CtaPanel className="max-w-gate">
        <h2>NXDI 계정</h2>
        <p className="lede">
          {user
            ? "이미 DataGSM 계정으로 로그인되어 있습니다."
            : "DataGSM으로 로그인하면 투자 의향서를 작성하고 내 제출 내역을 확인할 수 있습니다."}
        </p>
        {user ? (
          <ButtonLink href="/intents">
            투자 의향 남기기
          </ButtonLink>
        ) : (
          <DataGsmLoginButton />
        )}
      </CtaPanel>
    </AppShell>
  );
}
