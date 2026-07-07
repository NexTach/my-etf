import type { Holding, ManualPortfolioStore, PortfolioOverview } from "./types";
import { fetchUsdKrwExchangeRate } from "./exchange-rate";
import { prisma } from "./prisma";

const FALLBACK_EXCHANGE_RATE = 1380;

function defaultManualPortfolio(): PortfolioOverview {
  const exchangeRate = FALLBACK_EXCHANGE_RATE;
  const holdings: Holding[] = [
    {
      symbol: "SCHD",
      name: "Schwab U.S. Dividend Equity ETF",
      marketCountry: "US",
      currency: "USD",
      quantity: 21,
      lastPrice: 28.4,
      averagePurchasePrice: 27.2,
      purchaseExchangeRate: exchangeRate,
      marketValue: 596.4,
      marketValueKrw: 596.4 * exchangeRate,
      costBasisKrw: 27.2 * 21 * exchangeRate,
      priceProfitLossRate: 0.044,
      profitLossKrw: (28.4 - 27.2) * 21 * exchangeRate,
      fxGainLossKrw: 0,
      profitLossRate: 0.044
    },
    {
      symbol: "VOO",
      name: "Vanguard S&P 500 ETF",
      marketCountry: "US",
      currency: "USD",
      quantity: 2.8,
      lastPrice: 514.2,
      averagePurchasePrice: 481,
      purchaseExchangeRate: exchangeRate,
      marketValue: 1439.76,
      marketValueKrw: 1439.76 * exchangeRate,
      costBasisKrw: 481 * 2.8 * exchangeRate,
      priceProfitLossRate: 0.069,
      profitLossKrw: (514.2 - 481) * 2.8 * exchangeRate,
      fxGainLossKrw: 0,
      profitLossRate: 0.069
    },
    {
      symbol: "JEPI",
      name: "JPMorgan Equity Premium Income ETF",
      marketCountry: "US",
      currency: "USD",
      quantity: 12,
      lastPrice: 57.1,
      averagePurchasePrice: 55.6,
      purchaseExchangeRate: exchangeRate,
      marketValue: 685.2,
      marketValueKrw: 685.2 * exchangeRate,
      costBasisKrw: 55.6 * 12 * exchangeRate,
      priceProfitLossRate: 0.027,
      profitLossKrw: (57.1 - 55.6) * 12 * exchangeRate,
      fxGainLossKrw: 0,
      profitLossRate: 0.027
    },
    {
      symbol: "005930",
      name: "삼성전자",
      marketCountry: "KR",
      currency: "KRW",
      quantity: 18,
      lastPrice: 72000,
      averagePurchasePrice: 69000,
      marketValue: 1296000,
      marketValueKrw: 1296000,
      costBasisKrw: 69000 * 18,
      priceProfitLossRate: 0.043,
      profitLossKrw: (72000 - 69000) * 18,
      fxGainLossKrw: 0,
      profitLossRate: 0.043
    }
  ];

  return {
    source: "manual",
    fetchedAt: new Date().toISOString(),
    exchangeRate,
    exchangeRateFetchedAt: new Date().toISOString(),
    exchangeRateSource: "fallback",
    totalMarketValueKrw: holdings.reduce((sum, holding) => sum + holding.marketValueKrw, 0),
    holdings
  };
}

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

async function ensurePortfolioSeed() {
  const count = await prisma.portfolioHolding.count();

  if (count === 0) {
    const fallback = defaultManualPortfolio();
    await prisma.portfolioHolding.createMany({
      data: fallback.holdings.map((holding) => ({
        symbol: holding.symbol,
        name: holding.name,
        marketCountry: holding.marketCountry,
        currency: holding.currency,
        quantity: holding.quantity,
        lastPrice: holding.lastPrice,
        averagePurchasePrice: holding.averagePurchasePrice,
        purchaseExchangeRate: holding.purchaseExchangeRate,
        profitLossRate: holding.profitLossRate
      }))
    });
  }
}

export async function readManualPortfolioStore(): Promise<ManualPortfolioStore> {
  await ensurePortfolioSeed();
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
      marketCountry: holding.marketCountry as "KR" | "US",
      currency: holding.currency as "KRW" | "USD",
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
  const profitLossRate =
    input.averagePurchasePrice && input.averagePurchasePrice > 0
      ? (input.lastPrice - input.averagePurchasePrice) / input.averagePurchasePrice
      : undefined;
  await prisma.portfolioHolding.upsert({
    where: { symbol },
    create: {
      symbol,
      name: input.name,
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

export async function deleteManualHolding(symbol: string) {
  await prisma.portfolioHolding.deleteMany({
    where: { symbol: symbol.toUpperCase() }
  });
}
