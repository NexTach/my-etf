import { formatCurrency, formatDateTime, formatKrw, formatNumber } from "@/lib/format";
import { stockPrimaryLabel, stockSecondaryLabel } from "@/lib/stock-display";
import type { DisclosureTrade } from "@/lib/types";

function formatPercent(value: number) {
  return `${formatNumber(value * 100, 2)}%`;
}

function tradeTotal(trade: DisclosureTrade) {
  const nativeAmount = trade.quantity * trade.orderPrice;
  return trade.currency === "USD" ? nativeAmount * (trade.exchangeRate ?? 0) : nativeAmount;
}

export function TradeSideBadge({ side }: { side: DisclosureTrade["side"] }) {
  return <span className={`trade-side ${side === "BUY" ? "buy" : "sell"}`}>{side === "BUY" ? "매수" : "매도"}</span>;
}

export function ProfitRateText({ value }: { value: number }) {
  const tone = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return <span className={`profit-rate ${tone}`}>{formatPercent(value)}</span>;
}

export function DisclosureTradeSummary({ trades }: { trades: DisclosureTrade[] }) {
  if (trades.length === 0) return null;

  return (
    <div className="trade-chip-list">
      {trades.map((trade) => {
        const secondaryLabel = stockSecondaryLabel(trade);
        return (
          <span className="trade-chip" key={trade.id}>
            <TradeSideBadge side={trade.side} />
            <strong>{stockPrimaryLabel(trade)}</strong>
            {secondaryLabel ? <em>{secondaryLabel}</em> : null}
            <span>{formatNumber(trade.quantity, 4)}주</span>
            <ProfitRateText value={trade.profitRate} />
          </span>
        );
      })}
    </div>
  );
}

export function DisclosureTradeDetails({ trades }: { trades: DisclosureTrade[] }) {
  if (trades.length === 0) return null;

  return (
    <div className="disclosure-trade-detail-grid">
      {trades.map((trade) => {
        const secondaryLabel = stockSecondaryLabel(trade);
        return (
          <article className="disclosure-trade-detail" key={trade.id}>
            <header>
              <TradeSideBadge side={trade.side} />
              <div>
                <h3>{stockPrimaryLabel(trade)}</h3>
                {secondaryLabel ? <p>{secondaryLabel}</p> : null}
              </div>
            </header>
            <dl>
              <div>
                <dt>수량</dt>
                <dd>{formatNumber(trade.quantity, 6)}주</dd>
              </div>
              <div>
                <dt>체결가</dt>
                <dd>{formatCurrency(trade.orderPrice, trade.currency, 6)}</dd>
              </div>
              <div>
                <dt>주문 금액</dt>
                <dd>{formatKrw(tradeTotal(trade))}</dd>
              </div>
              <div>
                <dt>수익률</dt>
                <dd>
                  <ProfitRateText value={trade.profitRate} />
                </dd>
              </div>
              <div>
                <dt>기준환율</dt>
                <dd>{trade.exchangeRate ? `${formatNumber(trade.exchangeRate, 2)}원` : "-"}</dd>
              </div>
              <div>
                <dt>수수료</dt>
                <dd className={trade.feeKrw !== 0 ? "cost-highlight" : undefined}>{formatKrw(trade.feeKrw)}</dd>
              </div>
              <div>
                <dt>세금</dt>
                <dd className={trade.taxKrw !== 0 ? "cost-highlight" : undefined}>{formatKrw(trade.taxKrw)}</dd>
              </div>
              <div>
                <dt>주문 일시</dt>
                <dd>{formatDateTime(trade.orderedAt)}</dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}
