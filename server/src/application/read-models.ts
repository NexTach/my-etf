import { calculateExpectedInvestorDividend } from "../domain/dividend-allocation.js";
import { PRODUCT_MAX_INVESTMENT_KRW, PRODUCT_MIN_INVESTMENT_KRW } from "../domain/product-policy.js";
import { withdrawalLimitForUser } from "../domain/withdrawal-limit.js";
import { readDisclosure, readDisclosures } from "../infrastructure/disclosures.js";
import {
  forecastDividend,
  getDividendRecord,
  readDividendRecords,
  readMonthlyDividendRecords,
  summarizePortfolioDividend
} from "../infrastructure/dividends.js";
import { mapWithConcurrency } from "../infrastructure/concurrency.js";
import { fetchMarketCandles, type MarketChart } from "../infrastructure/market-data.js";
import { getManualPortfolioOverview } from "../infrastructure/portfolio-store.js";
import {
  kstDateKey,
  readRoadmapEvents,
  roadmapHorizonEndDate
} from "../infrastructure/roadmap.js";
import { readAcceptedNetInvestmentPrincipal, readStore, readStoreForUser } from "../infrastructure/store.js";

function chartRecord(entries: Array<readonly [string, MarketChart | null]>) {
  return Object.fromEntries(entries) as Record<string, MarketChart | null>;
}

async function chartsFor(
  symbols: readonly string[],
  options: Parameters<typeof fetchMarketCandles>[1]
) {
  const deadlineAt = Date.now() + 7_000;
  const entries = await mapWithConcurrency(symbols, 4, async (symbol) => {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) return [symbol, null] as const;
    return [
      symbol,
      await settleBefore(fetchMarketCandles(symbol, options).catch(() => null), remainingMs, null)
    ] as const;
  });
  return chartRecord(entries);
}

async function settleBefore<T>(promise: Promise<T>, milliseconds: number, fallback: T): Promise<T> {
  if (milliseconds <= 0) return fallback;
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => { timeout = setTimeout(() => resolve(fallback), milliseconds); })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function publicHomeReadModel() {
  const portfolio = await getManualPortfolioOverview();
  const [scheduledDividend, portfolioDividend, monthlyDividendRecords, disclosures, dailyCharts, dailyChangeCharts] =
    await Promise.all([
      forecastDividend(portfolio, portfolio.totalMarketValueKrw),
      summarizePortfolioDividend(portfolio),
      readMonthlyDividendRecords(),
      readDisclosures({ take: 3 }),
      chartsFor(portfolio.holdings.map((holding) => holding.symbol), { range: "1y", interval: "1d", limit: 252 }),
      chartsFor(portfolio.holdings.map((holding) => holding.symbol), { range: "1d", interval: "1d", limit: 1 })
    ]);
  return { portfolio, scheduledDividend, portfolioDividend, monthlyDividendRecords, disclosures, dailyCharts, dailyChangeCharts };
}

export async function disclosuresReadModel() {
  const roadmapToday = kstDateKey();
  const roadmapHorizon = roadmapHorizonEndDate(roadmapToday);
  const [items, roadmapEvents] = await Promise.all([
    readDisclosures(),
    readRoadmapEvents({ through: roadmapHorizon })
  ]);
  return { items, total: items.length, page: 1, pageSize: items.length, roadmapEvents, roadmapToday, roadmapHorizon };
}

export async function disclosureReadModel(id: string) {
  return readDisclosure(id);
}

export async function stockReadModel(symbol: string) {
  const portfolio = await getManualPortfolioOverview();
  const normalized = symbol.trim().toUpperCase();
  const holding = portfolio.holdings.find((item) => item.symbol.toUpperCase() === normalized);
  if (!holding) return null;
  const [dividendRecord, dailyChart, weeklyChart, monthlyChart] = await Promise.all([
    getDividendRecord(holding.symbol),
    fetchMarketCandles(holding.symbol, { range: "1mo", interval: "1d", limit: 2 }).catch(() => null),
    fetchMarketCandles(holding.symbol, { range: "1y", interval: "1wk", limit: 52 }).catch(() => null),
    fetchMarketCandles(holding.symbol, { range: "5y", interval: "1mo", limit: 60 }).catch(() => null)
  ]);
  return { portfolio, holding, dividendRecord: dividendRecord ?? null, dailyChart, weeklyChart, monthlyChart };
}

export const METRIC_SLUGS = ["daily-change", "holding-return", "dividend-yield"] as const;
export type MetricSlug = typeof METRIC_SLUGS[number];

export async function metricReadModel(metric: MetricSlug) {
  const portfolio = await getManualPortfolioOverview();
  const [portfolioDividend, monthlyDividendRecords, dailyCharts] = await Promise.all([
    summarizePortfolioDividend(portfolio),
    metric === "dividend-yield" ? readMonthlyDividendRecords() : Promise.resolve([]),
    metric === "daily-change"
      ? chartsFor(portfolio.holdings.map((holding) => holding.symbol), { range: "1d", interval: "1d", limit: 1 })
      : Promise.resolve({})
  ]);
  return { metric, portfolio, portfolioDividend, monthlyDividendRecords, dailyCharts };
}

export async function simulationReadModel(requestedAmount: number) {
  const amount = Math.min(
    PRODUCT_MAX_INVESTMENT_KRW,
    Math.max(PRODUCT_MIN_INVESTMENT_KRW, Number.isFinite(requestedAmount) ? requestedAmount : 100_000)
  );
  const [portfolio, currentInvestorPrincipalKrw] = await Promise.all([
    getManualPortfolioOverview(),
    readAcceptedNetInvestmentPrincipal()
  ]);
  const forecast = await forecastDividend(portfolio, amount);
  const annualPortfolioDividendYield =
    forecast.amountKrw > 0 && typeof forecast.annualDividendKrw === "number"
      ? forecast.annualDividendKrw / forecast.amountKrw
      : undefined;
  const expectedPayout = typeof annualPortfolioDividendYield === "number"
    ? calculateExpectedInvestorDividend({
        investmentKrw: amount,
        currentPortfolioMarketValueKrw: portfolio.totalMarketValueKrw,
        currentInvestorPrincipalKrw,
        annualPortfolioDividendYield
      })
    : undefined;
  return { amount, portfolio, forecast, currentInvestorPrincipalKrw, annualPortfolioDividendYield, expectedPayout };
}

export async function intentsReadModel(userId: string) {
  const [store, portfolio] = await Promise.all([readStoreForUser(userId), getManualPortfolioOverview()]);
  return { store, portfolio, withdrawalLimit: withdrawalLimitForUser(store, portfolio, userId) };
}

export async function adminDashboardReadModel() {
  const roadmapToday = kstDateKey();
  const roadmapHorizon = roadmapHorizonEndDate(roadmapToday);
  const [store, portfolio, dividendRecords, monthlyDividendRecords, disclosures, roadmapEvents] = await Promise.all([
    readStore(),
    getManualPortfolioOverview(),
    readDividendRecords(),
    readMonthlyDividendRecords(),
    readDisclosures(),
    readRoadmapEvents({ through: roadmapHorizon })
  ]);
  return { store, portfolio, dividendRecords, monthlyDividendRecords, disclosures, roadmapEvents, roadmapToday, roadmapHorizon };
}
