import type { Holding, ManualPortfolioStore, MarketCode, PortfolioOverview } from "./types";
import { fetchUsdKrwExchangeRate } from "./exchange-rate";
import { prisma } from "./prisma";

const MIN_REMAINING_QUANTITY = 0.0000001;

function normalizeStore(store: ManualPortfolioStore): ManualPortfolioStore {
  const exchangeRate = Number(store.exchangeRate) || 1380;
  const holdings = store.holdings.map((holding) => {
    const marketValue = holding.quantity * holding.lastPrice;
    const priceProfitLossRate =
      holding.averagePurchasePrice && holding.averagePurchasePrice > 0
        ? (holding.lastPrice - holding.averagePurchasePrice) / holding.averagePurchasePrice
        : undefined;
    const purchaseExchangeRate =
      holding.currency === "USD"
        ? Number(holding.purchaseExchangeRate) || exchangeRate
        : undefined;
    const costBasisNative =
      holding.averagePurchasePrice && holding.averagePurchasePrice > 0
        ? holding.averagePurchasePrice * holding.quantity
        : undefined;
    const costBasisKrw =
      costBasisNative === undefined
        ? undefined
        : holding.currency === "USD"
          ? costBasisNative * (purchaseExchangeRate ?? exchangeRate)
          : costBasisNative;
    const marketValueKrw = holding.currency === "USD" ? marketValue * exchangeRate : marketValue;
    const profitLossKrw =
      costBasisKrw !== undefined ? marketValueKrw - costBasisKrw : undefined;
    const fxGainLossKrw =
      holding.currency === "USD" && purchaseExchangeRate !== undefined
        ? marketValue * (exchangeRate - purchaseExchangeRate)
        : 0;
    const profitLossRate =
      costBasisKrw && costBasisKrw > 0 ? (marketValueKrw - costBasisKrw) / costBasisKrw : undefined;

    return {
      ...holding,
      purchaseExchangeRate,
      marketValue,
      marketValueKrw,
      costBasisKrw,
      priceProfitLossRate,
      fxGainLossKrw,
      profitLossKrw,
      profitLossRate
    };
  });

  return {
    exchangeRate,
    exchangeRateFetchedAt: store.exchangeRateFetchedAt,
    exchangeRateSource: store.exchangeRateSource,
    updatedAt: store.updatedAt,
    holdings
  };
}

function normalizeStoredMarketCode(value: string, currency: "KRW" | "USD", symbol: string): MarketCode {
  if (value === "NASDAQ" || value === "NYSE" || value === "AMEX" || value === "KOSPI" || value === "KOSDAQ") {
    return value;
  }
  if (currency === "KRW") return symbol.toUpperCase().endsWith(".KQ") ? "KOSDAQ" : "KOSPI";
  return "NASDAQ";
}

export async function readManualPortfolioStore(): Promise<ManualPortfolioStore> {
  const [exchangeRateSnapshot, holdings] = await Promise.all([
    fetchUsdKrwExchangeRate(),
    prisma.portfolioHolding.findMany({ orderBy: { symbol: "asc" } })
  ]);
  const latestUpdatedAt =
    holdings.reduce<Date | null>(
      (latest, holding) => (!latest || holding.updatedAt > latest ? holding.updatedAt : latest),
      null
    ) ?? new Date();

  return normalizeStore({
    exchangeRate: exchangeRateSnapshot.rate,
    exchangeRateFetchedAt: exchangeRateSnapshot.fetchedAt,
    exchangeRateSource: exchangeRateSnapshot.source,
    updatedAt: latestUpdatedAt.toISOString(),
    holdings: holdings.map((holding) => ({
      symbol: holding.symbol,
      name: holding.name,
      alias: holding.alias ?? undefined,
      currency: holding.currency as "KRW" | "USD",
      marketCountry: normalizeStoredMarketCode(holding.marketCountry, holding.currency as "KRW" | "USD", holding.symbol),
      quantity: holding.quantity,
      lastPrice: holding.lastPrice,
      averagePurchasePrice: holding.averagePurchasePrice ?? undefined,
      purchaseExchangeRate: holding.purchaseExchangeRate ?? undefined,
      marketValue: 0,
      marketValueKrw: 0,
      profitLossRate: holding.profitLossRate ?? undefined
    }))
  });
}

export async function getManualPortfolioOverview(): Promise<PortfolioOverview> {
  const store = await readManualPortfolioStore();
  return {
    source: "manual",
    fetchedAt: store.updatedAt,
    exchangeRate: store.exchangeRate,
    exchangeRateFetchedAt: store.exchangeRateFetchedAt ?? new Date().toISOString(),
    exchangeRateSource: store.exchangeRateSource ?? "fallback",
    totalMarketValueKrw: store.holdings.reduce((sum, holding) => sum + holding.marketValueKrw, 0),
    holdings: store.holdings
  };
}

export async function upsertManualHolding(input: Omit<Holding, "marketValue" | "marketValueKrw">) {
  const symbol = input.symbol.toUpperCase();
  const alias = input.alias?.trim();
  const profitLossRate =
    input.averagePurchasePrice && input.averagePurchasePrice > 0
      ? (input.lastPrice - input.averagePurchasePrice) / input.averagePurchasePrice
      : undefined;
  await prisma.portfolioHolding.upsert({
    where: { symbol },
    create: {
      symbol,
      name: input.name,
      alias,
      marketCountry: input.marketCountry,
      currency: input.currency,
      quantity: input.quantity,
      lastPrice: input.lastPrice,
      averagePurchasePrice: input.averagePurchasePrice,
      purchaseExchangeRate: input.purchaseExchangeRate,
      profitLossRate
    },
    update: {
      name: input.name,
      alias,
      marketCountry: input.marketCountry,
      currency: input.currency,
      quantity: input.quantity,
      lastPrice: input.lastPrice,
      averagePurchasePrice: input.averagePurchasePrice,
      purchaseExchangeRate: input.purchaseExchangeRate,
      profitLossRate
    }
  });
}

export async function applyManualHoldingTrade(input: {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  orderPrice: number;
  exchangeRate?: number;
}) {
  const symbol = input.symbol.toUpperCase();
  const holding = await prisma.portfolioHolding.findUnique({ where: { symbol } });

  if (!holding) return { status: "not_found" as const };

  if (input.side === "SELL") {
    const nextQuantity = holding.quantity - input.quantity;
    if (nextQuantity < -MIN_REMAINING_QUANTITY) return { status: "insufficient_quantity" as const };

    if (nextQuantity <= MIN_REMAINING_QUANTITY) {
      await prisma.portfolioHolding.delete({ where: { symbol } });
      return { status: "deleted" as const };
    }

    const profitLossRate =
      holding.averagePurchasePrice && holding.averagePurchasePrice > 0
        ? (input.orderPrice - holding.averagePurchasePrice) / holding.averagePurchasePrice
        : undefined;

    await prisma.portfolioHolding.update({
      where: { symbol },
      data: {
        quantity: nextQuantity,
        lastPrice: input.orderPrice,
        profitLossRate
      }
    });
    return { status: "updated" as const };
  }

  const currentAveragePurchasePrice =
    holding.averagePurchasePrice && holding.averagePurchasePrice > 0
      ? holding.averagePurchasePrice
      : holding.lastPrice;
  const currentNativeCost = currentAveragePurchasePrice * holding.quantity;
  const tradeNativeCost = input.orderPrice * input.quantity;
  const nextQuantity = holding.quantity + input.quantity;
  const nextAveragePurchasePrice = (currentNativeCost + tradeNativeCost) / nextQuantity;

  let nextPurchaseExchangeRate = holding.purchaseExchangeRate ?? undefined;
  if (holding.currency === "USD") {
    const tradeExchangeRate = input.exchangeRate ?? holding.purchaseExchangeRate ?? undefined;
    if (tradeExchangeRate) {
      const currentExchangeRate = holding.purchaseExchangeRate ?? tradeExchangeRate;
      nextPurchaseExchangeRate =
        (currentNativeCost * currentExchangeRate + tradeNativeCost * tradeExchangeRate) /
        (currentNativeCost + tradeNativeCost);
    }
  }

  const profitLossRate =
    nextAveragePurchasePrice > 0
      ? (input.orderPrice - nextAveragePurchasePrice) / nextAveragePurchasePrice
      : undefined;

  await prisma.portfolioHolding.update({
    where: { symbol },
    data: {
      quantity: nextQuantity,
      lastPrice: input.orderPrice,
      averagePurchasePrice: nextAveragePurchasePrice,
      purchaseExchangeRate: holding.currency === "USD" ? nextPurchaseExchangeRate : null,
      profitLossRate
    }
  });

  return { status: "updated" as const };
}

export async function deleteManualHolding(symbol: string) {
  await prisma.portfolioHolding.deleteMany({
    where: { symbol: symbol.toUpperCase() }
  });
}
