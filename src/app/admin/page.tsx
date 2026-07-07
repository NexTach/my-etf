import { LockKeyhole, UsersRound } from "lucide-react";
import Link from "next/link";
import { isAdminUser } from "@/lib/admin";
import { readDividendRecords } from "@/lib/dividends";
import { formatDateTime, formatKrw, statusLabel } from "@/lib/format";
import { getManualPortfolioOverview } from "@/lib/portfolio-store";
import { getUserSession } from "@/lib/session";
import { readStore } from "@/lib/store";
import type { IntentStatus } from "@/lib/types";

type AdminProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function statusClass(status: string) {
  if (status === "ACCEPTED") return "accepted";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function StatusForm({
  type,
  id,
  current
}: {
  type: "INVESTMENT" | "WITHDRAWAL";
  id: string;
  current: IntentStatus;
}) {
  return (
    <form className="split-actions" action="/api/admin/status" method="post">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={current} aria-label="상태">
        <option value="PENDING">대기</option>
        <option value="ACCEPTED">수락</option>
        <option value="REJECTED">거절</option>
      </select>
      <button className="secondary" type="submit">
        저장
      </button>
    </form>
  );
}

function HoldingForm({
  symbol,
  name,
  marketCountry,
  currency,
  quantity,
  lastPrice,
  averagePurchasePrice,
  profitLossRate
}: {
  symbol?: string;
  name?: string;
  marketCountry?: "KR" | "US";
  currency?: "KRW" | "USD";
  quantity?: number;
  lastPrice?: number;
  averagePurchasePrice?: number;
  profitLossRate?: number;
}) {
  return (
    <form className="form compact" action="/api/admin/portfolio/holding" method="post">
      <div className="inline-fields">
        <div className="field">
          <label htmlFor={`symbol-${symbol ?? "new"}`}>심볼</label>
          <input id={`symbol-${symbol ?? "new"}`} name="symbol" defaultValue={symbol} required />
        </div>
        <div className="field wide">
          <label htmlFor={`name-${symbol ?? "new"}`}>종목명</label>
          <input id={`name-${symbol ?? "new"}`} name="name" defaultValue={name} required />
        </div>
        <div className="field">
          <label htmlFor={`market-${symbol ?? "new"}`}>시장</label>
          <select id={`market-${symbol ?? "new"}`} name="marketCountry" defaultValue={marketCountry ?? "US"}>
            <option value="US">미국</option>
            <option value="KR">국내</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`currency-${symbol ?? "new"}`}>통화</label>
          <select id={`currency-${symbol ?? "new"}`} name="currency" defaultValue={currency ?? "USD"}>
            <option value="USD">USD</option>
            <option value="KRW">KRW</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`quantity-${symbol ?? "new"}`}>수량</label>
          <input
            id={`quantity-${symbol ?? "new"}`}
            name="quantity"
            type="number"
            step="0.000001"
            min="0"
            defaultValue={quantity}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`price-${symbol ?? "new"}`}>현재가</label>
          <input
            id={`price-${symbol ?? "new"}`}
            name="lastPrice"
            type="number"
            step="0.000001"
            min="0"
            defaultValue={lastPrice}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`avg-${symbol ?? "new"}`}>평단</label>
          <input
            id={`avg-${symbol ?? "new"}`}
            name="averagePurchasePrice"
            type="number"
            step="0.000001"
            min="0"
            defaultValue={averagePurchasePrice}
          />
        </div>
        <div className="field">
          <label htmlFor={`profit-${symbol ?? "new"}`}>손익률 %</label>
          <input
            id={`profit-${symbol ?? "new"}`}
            name="profitLossRate"
            type="number"
            step="0.01"
            defaultValue={typeof profitLossRate === "number" ? profitLossRate * 100 : undefined}
          />
        </div>
        <button type="submit">{symbol ? "수정" : "추가"}</button>
      </div>
    </form>
  );
}

function DividendForm({
  symbol,
  currency,
  annualDividendPerShare,
  trailingYield,
  expectedPaymentMonths,
  lastDividendPerShare,
  memo
}: {
  symbol?: string;
  currency?: "KRW" | "USD";
  annualDividendPerShare?: number;
  trailingYield?: number;
  expectedPaymentMonths?: number[];
  lastDividendPerShare?: number;
  memo?: string;
}) {
  return (
    <form className="form compact" action="/api/admin/dividends/record" method="post">
      <div className="inline-fields dividend">
        <div className="field">
          <label htmlFor={`div-symbol-${symbol ?? "new"}`}>심볼</label>
          <input id={`div-symbol-${symbol ?? "new"}`} name="symbol" defaultValue={symbol} required />
        </div>
        <div className="field">
          <label htmlFor={`div-currency-${symbol ?? "new"}`}>통화</label>
          <select id={`div-currency-${symbol ?? "new"}`} name="currency" defaultValue={currency ?? "USD"}>
            <option value="USD">USD</option>
            <option value="KRW">KRW</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`div-annual-${symbol ?? "new"}`}>연 배당/주</label>
          <input
            id={`div-annual-${symbol ?? "new"}`}
            name="annualDividendPerShare"
            type="number"
            step="0.000001"
            min="0"
            defaultValue={annualDividendPerShare}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`div-yield-${symbol ?? "new"}`}>수익률 %</label>
          <input
            id={`div-yield-${symbol ?? "new"}`}
            name="trailingYield"
            type="number"
            step="0.01"
            min="0"
            defaultValue={typeof trailingYield === "number" ? trailingYield * 100 : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor={`div-months-${symbol ?? "new"}`}>지급월</label>
          <input
            id={`div-months-${symbol ?? "new"}`}
            name="expectedPaymentMonths"
            placeholder="3,6,9,12"
            defaultValue={expectedPaymentMonths?.join(",")}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`div-last-${symbol ?? "new"}`}>최근 배당/주</label>
          <input
            id={`div-last-${symbol ?? "new"}`}
            name="lastDividendPerShare"
            type="number"
            step="0.000001"
            min="0"
            defaultValue={lastDividendPerShare}
          />
        </div>
        <div className="field wide">
          <label htmlFor={`div-memo-${symbol ?? "new"}`}>메모</label>
          <input id={`div-memo-${symbol ?? "new"}`} name="memo" defaultValue={memo} />
        </div>
        <button type="submit">{symbol ? "수정" : "추가"}</button>
      </div>
    </form>
  );
}

function AdminGate({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ETF</div>
          <div>
            <h1>관리자 로그인</h1>
            <p>의향서 상태 관리</p>
          </div>
        </div>
        <Link className="button secondary" href="/">
          사용자 화면
        </Link>
      </header>

      <section className="panel" style={{ maxWidth: 440 }}>
        <h2>
          <LockKeyhole size={18} /> 관리자 권한 필요
        </h2>
        <p className="lede">
          {signedIn
            ? "현재 DataGSM 계정 이메일은 관리자 환경변수에 포함되어 있지 않습니다."
            : "DataGSM으로 로그인한 뒤, 이메일이 ADMIN_EMAILS에 포함된 계정만 접근할 수 있습니다."}
        </p>
        {!signedIn ? (
          <a className="button" href="/api/auth/datagsm/start">
            DataGSM으로 로그인
          </a>
        ) : null}
      </section>
    </main>
  );
}

export default async function AdminPage({ searchParams }: AdminProps) {
  const params = (await searchParams) ?? {};
  const user = await getUserSession();
  if (!isAdminUser(user)) return <AdminGate signedIn={Boolean(user)} />;

  const [store, portfolio, dividendRecords] = await Promise.all([
    readStore(),
    getManualPortfolioOverview(),
    readDividendRecords()
  ]);
  const acceptedInvestment = store.investmentIntents
    .filter((intent) => intent.status === "ACCEPTED")
    .reduce((sum, intent) => sum + intent.amountKrw, 0);
  const pendingInvestment = store.investmentIntents
    .filter((intent) => intent.status === "PENDING")
    .reduce((sum, intent) => sum + intent.amountKrw, 0);
  const pendingWithdrawal = store.withdrawalIntents
    .filter((intent) => intent.status === "PENDING")
    .reduce((sum, intent) => sum + intent.amountKrw, 0);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ETF</div>
          <div>
            <h1>관리자 페이지</h1>
            <p>투자/출금 의향서 확인 및 상태 변경</p>
          </div>
        </div>
        <Link className="button secondary" href="/">
          사용자 화면
        </Link>
      </header>

      {params.updated ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          상태가 저장되었습니다.
        </div>
      ) : null}
      {params.portfolio ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          포트폴리오가 저장되었습니다.
        </div>
      ) : null}
      {params.dividend ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          배당 데이터가 저장되었습니다.
        </div>
      ) : null}

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>운영 포트폴리오 관리</h2>
        <p className="lede">
          보유 종목, 수량, 현재가, USD 환율을 관리자 화면에서 관리합니다.
        </p>
        <form className="form compact" action="/api/admin/portfolio/exchange-rate" method="post">
          <div className="inline-fields exchange">
            <div className="field">
              <label htmlFor="exchangeRate">USD/KRW 환율</label>
              <input
                id="exchangeRate"
                name="exchangeRate"
                type="number"
                step="0.01"
                min="500"
                max="3000"
                defaultValue={portfolio.exchangeRate}
                required
              />
            </div>
            <button type="submit">환율 저장</button>
          </div>
        </form>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>종목 수정</th>
                <th>평가금액</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((holding) => (
                <tr key={holding.symbol}>
                  <td>
                    <HoldingForm {...holding} />
                  </td>
                  <td>{formatKrw(holding.marketValueKrw)}</td>
                  <td>
                    <form action="/api/admin/portfolio/delete" method="post">
                      <input type="hidden" name="symbol" value={holding.symbol} />
                      <button className="ghost" type="submit">
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3}>
                  <HoldingForm />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>배당 데이터 관리</h2>
        <p className="lede">
          예상 배당은 이 표의 연 배당/주와 지급월을 기준으로 계산됩니다. 지급월은 쉼표로 입력합니다.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>배당 데이터</th>
                <th>동기화</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {dividendRecords.map((record) => (
                <tr key={record.symbol}>
                  <td>
                    <DividendForm {...record} />
                  </td>
                  <td>
                    <form action="/api/admin/dividends/sync" method="post">
                      <input type="hidden" name="symbol" value={record.symbol} />
                      <button className="secondary" type="submit">
                        외부 동기화
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action="/api/admin/dividends/delete" method="post">
                      <input type="hidden" name="symbol" value={record.symbol} />
                      <button className="ghost" type="submit">
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3}>
                  <DividendForm />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid three" style={{ marginBottom: 16 }}>
        <div className="panel metric">
          <span>수락된 투자 의향</span>
          <strong>{formatKrw(acceptedInvestment)}</strong>
        </div>
        <div className="panel metric">
          <span>대기 중 투자 의향</span>
          <strong>{formatKrw(pendingInvestment)}</strong>
        </div>
        <div className="panel metric">
          <span>대기 중 출금 의향</span>
          <strong>{formatKrw(pendingWithdrawal)}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>
          <UsersRound size={18} /> 투자 의향서
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>신청자</th>
                <th>금액</th>
                <th>입금자명</th>
                <th>연락처</th>
                <th>보호자</th>
                <th>상태</th>
                <th>제출일</th>
                <th>변경</th>
              </tr>
            </thead>
            <tbody>
              {store.investmentIntents.map((intent) => (
                <tr key={intent.id}>
                  <td>
                    <strong>{intent.userName}</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>{intent.userEmail}</span>
                  </td>
                  <td>{formatKrw(intent.amountKrw)}</td>
                  <td>{intent.depositorName}</td>
                  <td>{intent.contact}</td>
                  <td>{intent.guardianConfirmed ? "확인 예정" : "미확인"}</td>
                  <td>
                    <span className={`badge ${statusClass(intent.status)}`}>{statusLabel(intent.status)}</span>
                  </td>
                  <td>{formatDateTime(intent.createdAt)}</td>
                  <td>
                    <StatusForm type="INVESTMENT" id={intent.id} current={intent.status} />
                  </td>
                </tr>
              ))}
              {store.investmentIntents.length === 0 ? (
                <tr>
                  <td colSpan={8}>투자 의향서가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>출금 의향서</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>신청자</th>
                <th>금액</th>
                <th>계좌</th>
                <th>예금주</th>
                <th>연락처</th>
                <th>상태</th>
                <th>제출일</th>
                <th>변경</th>
              </tr>
            </thead>
            <tbody>
              {store.withdrawalIntents.map((intent) => (
                <tr key={intent.id}>
                  <td>
                    <strong>{intent.userName}</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>{intent.userEmail}</span>
                  </td>
                  <td>{formatKrw(intent.amountKrw)}</td>
                  <td>
                    {intent.bankName}
                    <br />
                    <span style={{ color: "var(--muted)" }}>{intent.accountNumber}</span>
                  </td>
                  <td>{intent.accountHolder}</td>
                  <td>{intent.contact}</td>
                  <td>
                    <span className={`badge ${statusClass(intent.status)}`}>{statusLabel(intent.status)}</span>
                  </td>
                  <td>{formatDateTime(intent.createdAt)}</td>
                  <td>
                    <StatusForm type="WITHDRAWAL" id={intent.id} current={intent.status} />
                  </td>
                </tr>
              ))}
              {store.withdrawalIntents.length === 0 ? (
                <tr>
                  <td colSpan={8}>출금 의향서가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
