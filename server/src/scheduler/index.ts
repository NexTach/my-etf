import cron, { type ScheduledTask } from "node-cron";
import type { FastifyBaseLogger } from "fastify";
import { runDividendSyncJob, runFinalizePreviousJob, runRefreshJob } from "../routes/cron.js";

const TIMEZONE = "Asia/Seoul";

async function logJob<T>(name: string, logger: FastifyBaseLogger, job: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    const result = await job();
    logger.info({ job: name, durationMs: Date.now() - startedAt, result }, "Scheduled job completed");
  } catch (error) {
    logger.error({ job: name, durationMs: Date.now() - startedAt, err: error }, "Scheduled job failed");
  }
}

export function startScheduler(logger: FastifyBaseLogger) {
  const tasks: ScheduledTask[] = [
    cron.schedule("5 * * * *", () => void logJob("portfolio-refresh", logger, runRefreshJob), { timezone: TIMEZONE }),
    cron.schedule("10 0 * * *", () => void logJob("portfolio-finalize-previous", logger, runFinalizePreviousJob), { timezone: TIMEZONE }),
    cron.schedule("15 3 * * *", () => void logJob("dividend-sync", logger, runDividendSyncJob), { timezone: TIMEZONE })
  ];

  // Named locks make startup catch-up safe when a container is replaced near a schedule boundary.
  void (async () => {
    await logJob("startup-finalize-previous", logger, runFinalizePreviousJob);
    await logJob("startup-portfolio-refresh", logger, runRefreshJob);
    await logJob("startup-dividend-sync", logger, runDividendSyncJob);
  })();

  return {
    stop() {
      for (const task of tasks) task.stop();
    }
  };
}
