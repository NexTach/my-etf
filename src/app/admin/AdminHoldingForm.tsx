"use client";

import { useEffect, useMemo, useState } from "react";
import { ComputedValue, Field, Form, InlineFields } from "@/app/components/tds";
import type { Holding, MarketCode } from "@/lib/types";

type SearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
  currency?: "KRW" | "USD";
  marketCountry?: MarketCode;
  lastPrice?: number;
  source: string;
};

type AdminHoldingFormProps = Partial<Pick<
  Holding,
  | "symbol"
  | "name"
  | "marketCountry"
  | "currency"
  | "quantity"
  | "lastPrice"
  | "averagePurchasePrice"
  | "purchaseExchangeRate"
>>;

function profitLossRate(lastPrice?: number, averagePurchasePrice?: number) {
  if (!lastPrice || !averagePurchasePrice) return null;
  return ((lastPrice - averagePurchasePrice) / averagePurchasePrice) * 100;
}

function formatHoldingNumber(value?: number, digits = 4) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits
  }).format(value);
}

function normalizeMarketCode(value?: string, currency?: "KRW" | "USD", symbol?: string): MarketCode {
  if (value === "NASDAQ" || value === "NYSE" || value === "AMEX" || value === "KOSPI" || value === "KOSDAQ") {
    return value;
  }
  if (currency === "KRW") return symbol?.toUpperCase().endsWith(".KQ") ? "KOSDAQ" : "KOSPI";
  return "NASDAQ";
}

function currencyFromMarket(market: MarketCode): "KRW" | "USD" {
  return market === "KOSPI" || market === "KOSDAQ" ? "KRW" : "USD";
}

function marketLabel(market?: MarketCode) {
  if (market === "NYSE") return "뉴욕증권거래소";
  if (market === "AMEX") return "아메리칸증권거래소";
  if (market === "KOSPI") return "유가증권시장";
  if (market === "KOSDAQ") return "코스닥시장";
  return "나스닥";
}

export function AdminHoldingForm({
  symbol,
  name,
  marketCountry,
  currency,
  quantity,
  lastPrice,
  averagePurchasePrice,
  purchaseExchangeRate
}: AdminHoldingFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [form, setForm] = useState({
    symbol: symbol ?? "",
    name: name ?? "",
    marketCountry: normalizeMarketCode(marketCountry, currency, symbol),
    currency: currency ?? currencyFromMarket(normalizeMarketCode(marketCountry, currency, symbol)),
    quantity: quantity?.toString() ?? "",
    lastPrice: lastPrice?.toString() ?? "",
    averagePurchasePrice: averagePurchasePrice?.toString() ?? "",
    purchaseExchangeRate: purchaseExchangeRate?.toString() ?? ""
  });

  const computedRate = useMemo(
    () => profitLossRate(Number(form.lastPrice), Number(form.averagePurchasePrice)),
    [form.averagePurchasePrice, form.lastPrice]
  );

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(keyword)}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          setResults([]);
          return;
        }

        const json = (await response.json()) as { results?: SearchResult[] };
        setResults(json.results ?? []);
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  if (!symbol && !isOpen) {
    return (
      <button className="secondary" type="button" onClick={() => setIsOpen(true)}>
        종목 추가
      </button>
    );
  }

  if (symbol && !isOpen) {
    return (
      <div className="holding-summary">
        <div>
          <strong>{symbol}</strong>
          <span>{name}</span>
          <em>
            {formatHoldingNumber(quantity)}주 · 현재가 {formatHoldingNumber(lastPrice, 6)} · 평단{" "}
            {formatHoldingNumber(averagePurchasePrice, 6)}
          </em>
        </div>
        <button className="secondary" type="button" onClick={() => setIsOpen(true)}>
          수정
        </button>
      </div>
    );
  }

  async function selectResult(result: SearchResult) {
    let next = result;

    try {
      const response = await fetch(`/api/market/quote?symbol=${encodeURIComponent(result.symbol)}`);
      if (response.ok) {
        const json = (await response.json()) as { quote?: SearchResult | null };
        next = json.quote ?? result;
      }
    } catch {
      next = result;
    }

    setForm((current) => ({
      ...current,
      symbol: next.symbol,
      name: next.name,
      marketCountry: next.marketCountry ?? current.marketCountry,
      currency: next.currency ?? (next.marketCountry ? currencyFromMarket(next.marketCountry) : current.currency),
      lastPrice: next.lastPrice ? String(next.lastPrice) : current.lastPrice
    }));
    setQuery("");
    setResults([]);
  }

  return (
    <Form action="/api/admin/portfolio/holding" className="holding-form" compact method="post">
      <div className="symbol-search">
        <Field htmlFor={`search-${symbol ?? "new"}`} label="종목 검색">
          <div className="search-control">
            <input
              autoComplete="off"
              id={`search-${symbol ?? "new"}`}
              value={query}
              placeholder="종목명 또는 심볼"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            />
            {isSearching ? <span className="search-status">검색 중</span> : null}
          </div>
        </Field>
        {results.length > 0 ? (
          <div className="search-results">
            {results.map((result) => (
              <button
                className="search-result"
                key={`${result.source}-${result.symbol}`}
                type="button"
                onClick={() => void selectResult(result)}
              >
                <strong>{result.symbol}</strong>
                <span>{result.name}</span>
                <em>{[marketLabel(result.marketCountry), result.exchange, result.currency].filter(Boolean).join(" · ")}</em>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <InlineFields variant="holding">
        <Field htmlFor={`symbol-${symbol ?? "new"}`} label="심볼">
          <input
            id={`symbol-${symbol ?? "new"}`}
            name="symbol"
            value={form.symbol}
            onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))}
            required
          />
        </Field>
        <Field htmlFor={`name-${symbol ?? "new"}`} label="종목명" wide>
          <input
            id={`name-${symbol ?? "new"}`}
            name="name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </Field>
        <Field htmlFor={`market-${symbol ?? "new"}`} label="시장">
          <select
            id={`market-${symbol ?? "new"}`}
            name="marketCountry"
            value={form.marketCountry}
            onChange={(event) => {
              const marketCountry = event.target.value as MarketCode;
              setForm((current) => ({
                ...current,
                marketCountry,
                currency: currencyFromMarket(marketCountry)
              }));
            }}
          >
            <option value="NASDAQ">나스닥</option>
            <option value="NYSE">뉴욕증권거래소</option>
            <option value="AMEX">아메리칸증권거래소</option>
            <option value="KOSPI">유가증권시장</option>
            <option value="KOSDAQ">코스닥시장</option>
          </select>
        </Field>
        <Field htmlFor={`currency-${symbol ?? "new"}`} label="통화">
          <select
            id={`currency-${symbol ?? "new"}`}
            name="currency"
            value={form.currency}
            onChange={(event) =>
              setForm((current) => ({ ...current, currency: event.target.value as "KRW" | "USD" }))
            }
          >
            <option value="USD">USD</option>
            <option value="KRW">KRW</option>
          </select>
        </Field>
        <Field htmlFor={`quantity-${symbol ?? "new"}`} label="수량">
          <input
            id={`quantity-${symbol ?? "new"}`}
            name="quantity"
            type="number"
            step="0.000001"
            min="0"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            required
          />
        </Field>
        <Field htmlFor={`price-${symbol ?? "new"}`} label="현재가">
          <input
            id={`price-${symbol ?? "new"}`}
            name="lastPrice"
            type="number"
            step="0.000001"
            min="0"
            value={form.lastPrice}
            onChange={(event) => setForm((current) => ({ ...current, lastPrice: event.target.value }))}
            required
          />
        </Field>
        <Field htmlFor={`avg-${symbol ?? "new"}`} label="평단">
          <input
            id={`avg-${symbol ?? "new"}`}
            name="averagePurchasePrice"
            type="number"
            step="0.000001"
            min="0"
            value={form.averagePurchasePrice}
            onChange={(event) =>
              setForm((current) => ({ ...current, averagePurchasePrice: event.target.value }))
            }
          />
        </Field>
        <Field htmlFor={`purchase-fx-${symbol ?? "new"}`} label="매입환율">
          <input
            id={`purchase-fx-${symbol ?? "new"}`}
            name="purchaseExchangeRate"
            type="number"
            step="0.01"
            min="500"
            max="3000"
            value={form.purchaseExchangeRate}
            disabled={form.currency !== "USD"}
            onChange={(event) =>
              setForm((current) => ({ ...current, purchaseExchangeRate: event.target.value }))
            }
          />
        </Field>
        <ComputedValue label="손익률" value={computedRate === null ? "-" : `${computedRate.toFixed(2)}%`} />
        <button type="submit">{symbol ? "수정" : "추가"}</button>
        {symbol ? (
          <button
            className="ghost"
            formAction="/api/admin/portfolio/delete"
            formMethod="post"
            formNoValidate
            name="symbol"
            type="submit"
            value={symbol}
          >
            삭제
          </button>
        ) : null}
        {!symbol ? (
          <button className="ghost" type="button" onClick={() => setIsOpen(false)}>
            취소
          </button>
        ) : null}
      </InlineFields>
    </Form>
  );
}
