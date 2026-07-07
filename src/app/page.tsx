import { ArrowDownToLine, ArrowUpRight, CircleDollarSign, LogOut, RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { forecastDividend } from "@/lib/dividends";
import { formatDateTime, formatKrw, formatNumber, statusLabel } from "@/lib/format";
import { getManualPortfolioOverview } from "@/lib/portfolio-store";
import { getUserSession } from "@/lib/session";
import { readStore } from "@/lib/store";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function statusClass(status: string) {
  if (status === "ACCEPTED") return "accepted";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

export default async function Home({ searchParams }: HomeProps) {
  const user = await getUserSession();
  if (!user) redirect("/login");

  const params = (await searchParams) ?? {};
  const amount = Math.max(10000, Number(firstParam(params.amountKrw) ?? 100000) || 100000);
  const [portfolio, store] = await Promise.all([getManualPortfolioOverview(), readStore()]);
  const forecast = await forecastDividend(portfolio, amount);
  const myInvestments = store.investmentIntents.filter((intent) => intent.userId === user.id);
  const myWithdrawals = store.withdrawalIntents.filter((intent) => intent.userId === user.id);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ETF</div>
          <div>
            <h1>GSM Portfolio Intent</h1>
            <p>
              {user.name} · {user.userType === "alumni" ? "졸업생" : "재학생"}
            </p>
          </div>
        </div>
        <div className="nav-actions">
          <Link className="button secondary" href="/admin">
            관리자
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="ghost" type="submit" title="로그아웃">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </header>

      <section className="hero-band">
        <h2>운영 포트폴리오 기준 예상 배당과 의향 신청</h2>
        <p>
          관리자가 입력한 운영 포트폴리오를 기준으로 계산하고, 신청 금액은 실제 입금 없이
          관리자가 검토할 의향서로만 저장됩니다.
        </p>
      </section>

      {params.submitted ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          의향서가 제출되었습니다. 관리자가 확인 후 상태를 변경합니다.
        </div>
      ) : null}
      {params.error ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          입력값을 다시 확인해주세요.
        </div>
      ) : null}

      <section className="grid three" style={{ marginBottom: 16 }}>
        <div className="panel metric">
          <span>포트폴리오 평가금액</span>
          <strong>{formatKrw(portfolio.totalMarketValueKrw)}</strong>
        </div>
        <div className="panel metric">
          <span>데이터 소스</span>
          <strong>관리자 입력</strong>
        </div>
        <div className="panel metric">
          <span>USD 환율</span>
          <strong>{formatKrw(portfolio.exchangeRate)}</strong>
        </div>
      </section>

      <div className="grid two">
        <section className="panel">
          <h2>현재 포트폴리오</h2>
          <p className="lede">
            마지막 갱신 {formatDateTime(portfolio.fetchedAt)}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>종목</th>
                  <th>수량</th>
                  <th>현재가</th>
                  <th>평가금액</th>
                  <th>손익률</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((holding) => (
                  <tr key={holding.symbol}>
                    <td>
                      <strong>{holding.symbol}</strong>
                      <br />
                      <span style={{ color: "var(--muted)" }}>{holding.name}</span>
                    </td>
                    <td>{formatNumber(holding.quantity, 4)}</td>
                    <td>
                      {holding.currency === "USD" ? "$" : ""}
                      {formatNumber(holding.lastPrice, holding.currency === "USD" ? 2 : 0)}
                    </td>
                    <td>{formatKrw(holding.marketValueKrw)}</td>
                    <td>{holding.profitLossRate ? `${formatNumber(holding.profitLossRate * 100, 2)}%` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel">
          <h2>예상 배당 계산</h2>
          <form className="form" method="get">
            <div className="field">
              <label htmlFor="amountKrw">가정 투자금</label>
              <input id="amountKrw" name="amountKrw" type="number" min="10000" step="10000" defaultValue={amount} />
            </div>
            <button type="submit">
              <RefreshCw size={17} />
              다시 계산
            </button>
          </form>

          <div className="grid" style={{ marginTop: 16 }}>
            <div className="metric">
              <span>연 예상 배당</span>
              <strong>{formatKrw(forecast.annualDividendKrw)}</strong>
            </div>
            <div className="metric">
              <span>월평균 예상 배당</span>
              <strong>{formatKrw(forecast.monthlyAverageKrw)}</strong>
            </div>
          </div>
          <p className="lede" style={{ marginTop: 16 }}>
            배당락일 이후 매수, 세금, 분배금 변동, 환율 변동은 실제 수령액과 차이를 만들 수 있습니다.
          </p>
        </aside>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>종목별 예상 배당</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>종목</th>
                <th>배정금액</th>
                <th>예상수량</th>
                <th>연 배당</th>
                <th>월평균</th>
                <th>다음 예상월</th>
              </tr>
            </thead>
            <tbody>
              {forecast.lines.map((line) => (
                <tr key={line.symbol}>
                  <td>
                    <strong>{line.symbol}</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>{line.name}</span>
                  </td>
                  <td>{formatKrw(line.allocationKrw)}</td>
                  <td>{formatNumber(line.estimatedQuantity, 5)}</td>
                  <td>{formatKrw(line.annualDividendKrw)}</td>
                  <td>{formatKrw(line.monthlyAverageKrw)}</td>
                  <td>{line.nextPaymentMonth ? `${line.nextPaymentMonth}월` : "데이터 없음"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid two" style={{ marginTop: 16 }}>
        <section className="panel">
          <h2>
            <ArrowUpRight size={18} /> 투자 의향서
          </h2>
          <form className="form" action="/api/intents/invest" method="post">
            <div className="field">
              <label htmlFor="investAmount">의향 금액</label>
              <input id="investAmount" name="amountKrw" type="number" min="10000" step="10000" required />
            </div>
            <div className="field">
              <label htmlFor="depositorName">입금자명</label>
              <input id="depositorName" name="depositorName" defaultValue={user.name} required />
            </div>
            <div className="field">
              <label htmlFor="investContact">연락처</label>
              <input id="investContact" name="contact" placeholder="전화번호 또는 메신저 ID" required />
            </div>
            <label className="checkbox">
              <input type="checkbox" name="guardianConfirmed" value="true" />
              미성년자인 경우 보호자 동의는 서비스 외부에서 수동으로 제출합니다.
            </label>
            <div className="field">
              <label htmlFor="investNote">메모</label>
              <textarea id="investNote" name="note" />
            </div>
            <button type="submit">
              <CircleDollarSign size={17} />
              제출
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>
            <ArrowDownToLine size={18} /> 출금 의향서
          </h2>
          <form className="form" action="/api/intents/withdraw" method="post">
            <div className="field">
              <label htmlFor="withdrawAmount">의향 금액</label>
              <input id="withdrawAmount" name="amountKrw" type="number" min="10000" step="10000" required />
            </div>
            <div className="field">
              <label htmlFor="bankName">은행</label>
              <input id="bankName" name="bankName" required />
            </div>
            <div className="field">
              <label htmlFor="accountNumber">계좌번호</label>
              <input id="accountNumber" name="accountNumber" inputMode="numeric" required />
            </div>
            <div className="field">
              <label htmlFor="accountHolder">예금주</label>
              <input id="accountHolder" name="accountHolder" defaultValue={user.name} required />
            </div>
            <div className="field">
              <label htmlFor="withdrawContact">연락처</label>
              <input id="withdrawContact" name="contact" placeholder="전화번호 또는 메신저 ID" required />
            </div>
            <div className="field">
              <label htmlFor="withdrawNote">메모</label>
              <textarea id="withdrawNote" name="note" />
            </div>
            <button type="submit">제출</button>
          </form>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>내 제출 내역</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>구분</th>
                <th>금액</th>
                <th>상태</th>
                <th>제출일</th>
              </tr>
            </thead>
            <tbody>
              {[...myInvestments, ...myWithdrawals].map((intent) => (
                <tr key={intent.id}>
                  <td>{intent.type === "INVESTMENT" ? "투자" : "출금"}</td>
                  <td>{formatKrw(intent.amountKrw)}</td>
                  <td>
                    <span className={`badge ${statusClass(intent.status)}`}>{statusLabel(intent.status)}</span>
                  </td>
                  <td>{formatDateTime(intent.createdAt)}</td>
                </tr>
              ))}
              {myInvestments.length + myWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={4}>제출 내역이 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="notice" style={{ marginTop: 16 }}>
        <ShieldAlert size={17} /> 이 서비스는 투자 권유, 투자자문, 자동매매, 금전 보관 기능을 제공하지 않는
        의향서 관리 서비스입니다.
      </div>
    </main>
  );
}
