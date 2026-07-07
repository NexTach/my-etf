import type { Holding, ManualPortfolioStore, PortfolioOverview } from "./types";
import { prisma } from "./prisma";

const EXCHANGE_RATE_KEY = "USD_KRW";
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
      marketValue: 596.4,
      marketValueKrw: 596.4 * exchangeRate,
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
      marketValue: 1439.76,
      marketValueKrw: 1439.76 * exchangeRate,
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
      marketValue: 685.2,
      marketValueKrw: 685.2 * exchangeRate,
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
      profitLossRate: 0.043
    }
  ];

  return {
    source: "manual",
    fetchedAt: new Date().toISOString(),
    exchangeRate,
    totalMarketValueKrw: holdings.reduce((sum, holding) => sum + holding.marketValueKrw, 0),
    holdings
  };
}

function normalizeStore(store: ManualPortfolioStore): ManualPortfolioStore {
  const exchangeRate = Number(store.exchangeRate) || 1380;
  const holdings = store.holdings.map((holding) => {
    const marketValue = holding.quantity * holding.lastPrice;
    return {
      ...holding,
      marketValue,
      marketValueKrw: holding.currency === "USD" ? marketValue * exchangeRate : marketValue
    };
  });

  return {
    exchangeRate,
    updatedAt: store.updatedAt,
    holdings
  };
}

async function getExchangeRateSetting() {
  const setting = await prisma.portfolioSetting.findUnique({
    where: { key: EXCHANGE_RATE_KEY }
  });
  return Number(setting?.value) || 1380;
}

async function ensurePortfolioSeed() {
  const count = await prisma.portfolioHolding.count();
  const setting = await prisma.portfolioSetting.findUnique({
    where: { key: EXCHANGE_RATE_KEY }
  });

  if (!setting) {
    const fallback = defaultManualPortfolio();
    await prisma.portfolioSetting.create({
      data: { key: EXCHANGE_RATE_KEY, value: String(fallback.exchangeRate) }
    });
  }

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
        profitLossRate: holding.profitLossRate
      }))
    });
  }
}

export async function readManualPortfolioStore(): Promise<ManualPortfolioStore> {
  await ensurePortfolioSeed();
  const [exchangeRate, holdings] = await Promise.all([
    getExchangeRateSetting(),
    prisma.portfolioHolding.findMany({ orderBy: { symbol: "asc" } })
  ]);
  const latestUpdatedAt =
    holdings.reduce<Date | null>(
      (latest, holding) => (!latest || holding.updatedAt > latest ? holding.updatedAt : latest),
      null
    ) ?? new Date();

  return normalizeStore({
    exchangeRate,
    updatedAt: latestUpdatedAt.toISOString(),
    holdings: holdings.map((holding) => ({
      symbol: holding.symbol,
      name: holding.name,
      marketCountry: holding.marketCountry as "KR" | "US",
      currency: holding.currency as "KRW" | "USD",
      quantity: holding.quantity,
      lastPrice: holding.lastPrice,
      averagePurchasePrice: holding.averagePurchasePrice ?? undefined,
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
    totalMarketValueKrw: store.holdings.reduce((sum, holding) => sum + holding.marketValueKrw, 0),
    holdings: store.holdings
  };
}

export async function upsertManualHolding(input: Omit<Holding, "marketValue" | "marketValueKrw">) {
  const symbol = input.symbol.toUpperCase();
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
      profitLossRate: input.profitLossRate
    },
    update: {
      name: input.name,
      marketCountry: input.marketCountry,
      currency: input.currency,
      quantity: input.quantity,
      lastPrice: input.lastPrice,
      averagePurchasePrice: input.averagePurchasePrice,
      profitLossRate: input.profitLossRate
    }
  });
}

export async function deleteManualHolding(symbol: string) {
  await prisma.portfolioHolding.deleteMany({
    where: { symbol: symbol.toUpperCase() }
  });
}

export async function updateManualExchangeRate(exchangeRate: number) {
  await prisma.portfolioSetting.upsert({
    where: { key: EXCHANGE_RATE_KEY },
    create: { key: EXCHANGE_RATE_KEY, value: String(exchangeRate) },
    update: { value: String(exchangeRate) }
  });
}
