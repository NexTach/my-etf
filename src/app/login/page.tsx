import { LogIn, ShieldCheck } from "lucide-react";
import { isProduction } from "@/lib/env";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function errorMessage(error?: string | string[]) {
  const value = Array.isArray(error) ? error[0] : error;
  if (value === "datagsm_not_configured") return "DataGSM OAuth 환경변수가 아직 설정되지 않았습니다.";
  if (value === "not_eligible") return "재학생 또는 졸업생으로 확인되지 않아 이용할 수 없습니다.";
  if (value === "oauth_state") return "OAuth state 검증에 실패했습니다. 다시 로그인하세요.";
  if (value === "oauth_failed") return "DataGSM 로그인 처리 중 오류가 발생했습니다.";
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const message = errorMessage(params.error);

  return (
    <main className="shell">
      <section className="hero-band">
        <h2>GSM 구성원 전용 포트폴리오 의향서</h2>
        <p>
          운영자 1명의 공개 포트폴리오와 예상 배당을 확인하고, 실제 입금 처리 없이 투자 또는 출금
          의향만 제출합니다.
        </p>
      </section>

      <div className="grid two">
        <section className="panel">
          <h2>DataGSM 로그인 필요</h2>
          <p className="lede">
            재학생과 졸업생만 이용할 수 있으며, 자퇴 상태로 확인되는 계정은 차단됩니다.
          </p>
          {message ? <div className="notice">{message}</div> : null}
          <div className="stack" style={{ marginTop: 16 }}>
            <a className="button" href="/api/auth/datagsm/start">
              <LogIn size={18} />
              DataGSM으로 로그인
            </a>
            {!isProduction() ? (
              <form action="/api/auth/dev-login" method="post" className="form">
                <input type="hidden" name="name" value="개발 사용자" />
                <button className="secondary" type="submit">
                  개발용 로그인
                </button>
              </form>
            ) : null}
          </div>
        </section>

        <aside className="panel muted">
          <h3>
            <ShieldCheck size={18} /> 운영 범위
          </h3>
          <p className="lede">
            이 버전은 금전 수취, 자동 출금, 배당 지급, 주문 기능을 제공하지 않습니다. 관리자는 제출된
            의향서의 금액, 연락처, 계좌번호와 상태만 확인합니다.
          </p>
        </aside>
      </div>
    </main>
  );
}
