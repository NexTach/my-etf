import cron, { type ScheduledTask } from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { mapWithConcurrency } from "../infrastructure/concurrency.js";
import { fetchMarketCandles } from "../infrastructure/market-data.js";
import { prisma } from "../infrastructure/prisma.js";
import { runDividendSyncJob, runFinalizePreviousJob, runRefreshJob } from "../routes/cron.js";

const TIMEZONE = "Asia/Seoul";
const MARKET_CHART_PREWARM_CONCURRENCY = 3;
const HOME_CHART_VARIANTS = [
  { range: "1y", interval: "1d", limit: 252 },
  { range: "1d", interval: "1d", limit: 1 }
] as const;

async function logJob<T>(name: string, logger: FastifyBaseLogger, job: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    const result = await job();
    logger.info({ job: name, durationMs: Date.now() - startedAt, result }, "Scheduled job completed");
  } catch (error) {
    logger.error({ job: name, durationMs: Date.now() - startedAt, err: error }, "Scheduled job failed");
  }
}

export async function runMarketChartPrewarmJob() {
  const holdings = await prisma.portfolioHolding.findMany({
    select: { symbol: true },
    orderBy: { symbol: "asc" }
  });
  const requests = holdings.flatMap(({ symbol }) =>
    HOME_CHART_VARIANTS.map((options) => ({ symbol, options }))
  );
  const results = await mapWithConcurrency(requests, MARKET_CHART_PREWARM_CONCURRENCY, async ({ symbol, options }) => {
    try {
      return await fetchMarketCandles(symbol, options) ? "available" as const : "missing" as const;
    } catch {
      return "failed" as const;
    }
  });

  return {
    holdings: holdings.length,
    requested: requests.length,
    available: results.filter((status) => status === "available").length,
    missing: results.filter((status) => status === "missing").length,
    failed: results.filter((status) => status === "failed").length,
    concurrency: MARKET_CHART_PREWARM_CONCURRENCY
  };
}

export function startScheduler(logger: FastifyBaseLogger) {
  const tasks: ScheduledTask[] = [
    cron.schedule("5 * * * *", () => void logJob("portfolio-refresh", logger, runRefreshJob), { timezone: TIMEZONE }),
    cron.schedule("20 * * * *", () => void logJob("market-chart-prewarm", logger, runMarketChartPrewarmJob), { timezone: TIMEZONE }),
    cron.schedule("10 0 * * *", () => void logJob("portfolio-finalize-previous", logger, runFinalizePreviousJob), { timezone: TIMEZONE }),
    cron.schedule("15 3 * * *", () => void logJob("dividend-sync", logger, runDividendSyncJob), { timezone: TIMEZONE })
  ];

  // Named locks make startup catch-up safe when a container is replaced near a schedule boundary.
  void (async () => {
    await logJob("startup-finalize-previous", logger, runFinalizePreviousJob);
    await logJob("startup-portfolio-refresh", logger, runRefreshJob);
    await logJob("startup-dividend-sync", logger, runDividendSyncJob);
  })();
  void logJob("startup-market-chart-prewarm", logger, runMarketChartPrewarmJob);

  return {
    stop() {
      for (const task of tasks) task.stop();
    }
  };
}
