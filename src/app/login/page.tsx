import { LogIn } from "lucide-react";
import { AppShell, CtaPanel, Form, Grid, Navigation, Notice, Stack, Top } from "@/app/components/tds";
import { isProduction } from "@/lib/env";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function errorMessage(error?: string | string[]) {
  const value = Array.isArray(error) ? error[0] : error;
  if (value === "datagsm_not_configured") return "DataGSM OAuth 환경변수가 아직 설정되지 않았습니다.";
  if (value === "not_eligible") return "재학생 또는 졸업생으로 확인되지 않아 이용할 수 없습니다.";
  if (value === "oauth_state") return "OAuth state 검증에 실패했습니다. 다시 로그인하세요.";
  if (value === "oauth_origin") return "접속 주소와 OAuth 콜백 주소가 다릅니다. 같은 주소로 접속하세요.";
  if (value === "oauth_failed") return "DataGSM 로그인 처리 중 오류가 발생했습니다.";
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const message = errorMessage(params.error);

  return (
    <AppShell>
      <Navigation title="T-ETF" description="DataGSM 인증" />

      <Top
        title="GSM 구성원만 이용할 수 있어요"
        description="운영 포트폴리오와 예상 배당을 확인하고, 실제 입금 처리 없이 투자 또는 출금 의향만 제출합니다."
      />

      <Grid columns={1}>
        <CtaPanel className="login-panel">
          <div>
            <h2>DataGSM으로 계속하기</h2>
            <p className="lede">
              재학생과 졸업생만 이용할 수 있으며, 자퇴 상태로 확인되는 계정은 차단됩니다.
            </p>
          </div>
          {message ? <Notice>{message}</Notice> : null}
          <Stack>
            <a className="button" href="/api/auth/datagsm/start">
              <LogIn size={18} />
              DataGSM으로 로그인
            </a>
            {!isProduction() ? (
              <Form action="/api/auth/dev-login" method="post">
                <input type="hidden" name="name" value="개발 사용자" />
                <button className="secondary" type="submit">
                  개발용 로그인
                </button>
              </Form>
            ) : null}
          </Stack>
        </CtaPanel>
      </Grid>
    </AppShell>
  );
}
