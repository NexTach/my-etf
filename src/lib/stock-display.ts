import type { MarketCode } from "./types";

type StockIdentity = {
  symbol: string;
  name?: string;
  marketCountry?: MarketCode;
  currency?: "KRW" | "USD";
};

function clean(value?: string) {
  return value?.trim() ?? "";
}

export function isKoreanStock(stock: StockIdentity) {
  const symbol = stock.symbol.trim().toUpperCase();
  return (
    stock.currency === "KRW" ||
    stock.marketCountry === "KOSPI" ||
    stock.marketCountry === "KOSDAQ" ||
    /^\d{6}(\.KQ)?$/.test(symbol)
  );
}

export function stockPrimaryLabel(stock: StockIdentity) {
  const name = clean(stock.name);
  if (isKoreanStock(stock) && name) return name;
  return stock.symbol;
}

export function stockSecondaryLabel(stock: StockIdentity) {
  const secondary = isKoreanStock(stock) ? stock.symbol : clean(stock.name);
  return secondary && secondary !== stockPrimaryLabel(stock) ? secondary : undefined;
}

export function stockFullLabel(stock: StockIdentity) {
  const secondary = stockSecondaryLabel(stock);
  return secondary ? `${stockPrimaryLabel(stock)} (${secondary})` : stockPrimaryLabel(stock);
}
