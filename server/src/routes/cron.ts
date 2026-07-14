import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  finalizePortfolioDailySnapshot,
  finalizePreviousPortfolioDailySnapshot,
  refreshPortfolioMarketSnapshot
} from "../infrastructure/portfolio-store.js";
import { syncScheduledDividendRecords } from "../infrastructure/dividends.js";
import { withMysqlNamedLock } from "../infrastructure/mysql-named-lock.js";

function cronAuthorized(request: FastifyRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.authorization === `Bearer ${secret}`);
}

export async function runRefreshJob() {
  return withMysqlNamedLock("nxdi:job:portfolio-refresh", refreshPortfolioMarketSnapshot);
}

export async function runDividendSyncJob() {
  return withMysqlNamedLock("nxdi:job:dividend-sync", syncScheduledDividendRecords);
}

export async function runFinalizePreviousJob() {
  return withMysqlNamedLock("nxdi:job:portfolio-finalize-previous", finalizePreviousPortfolioDailySnapshot);
}

export async function registerCronRoutes(app: FastifyInstance) {
  app.get("/api/cron/portfolio/refresh", async (request, reply) => {
    if (!cronAuthorized(request)) return reply.code(401).send({ error: "unauthorized" });
    const result = await runRefreshJob();
    return result.acquired ? result.value : { status: "skipped", reason: "locked" };
  });

  app.get("/api/cron/portfolio/finalize-previous", async (request, reply) => {
    if (!cronAuthorized(request)) return reply.code(401).send({ error: "unauthorized" });
    const result = await runFinalizePreviousJob();
    return result.acquired ? result.value : { status: "skipped", reason: "locked" };
  });

  app.get("/api/cron/dividends/sync", async (request, reply) => {
    if (!cronAuthorized(request)) return reply.code(401).send({ error: "unauthorized" });
    const result = await runDividendSyncJob();
    return result.acquired ? { status: "completed", records: result.value ?? [] } : { status: "skipped", reason: "locked" };
  });

  app.get("/api/admin/portfolio/snapshot/finalize", async (request, reply) => {
    if (!cronAuthorized(request)) return reply.code(401).send({ error: "unauthorized" });
    const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_date" });
    const result = await withMysqlNamedLock("nxdi:job:portfolio-finalize", async () => {
      await refreshPortfolioMarketSnapshot();
      return finalizePortfolioDailySnapshot(parsed.data.date);
    });
    if (!result.acquired) return { status: "skipped", reason: "locked" };
    return reply.code(result.value.status === "not_found" ? 404 : 200).send(result.value);
  });
}
