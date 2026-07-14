import { loadEnvironment } from "./config/env.js";
import { buildApp } from "./app.js";
import { disconnectPrisma } from "./infrastructure/prisma.js";
import { startScheduler } from "./scheduler/index.js";

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const environment = loadEnvironment();
process.env.TZ = environment.TZ;
const app = await buildApp({ logger: true });
await app.listen({ host: environment.HOST, port: environment.PORT });
const scheduler = startScheduler(app.log);

let closing = false;
async function close(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info({ signal }, "Shutting down");
  scheduler.stop();
  await app.close();
  await disconnectPrisma();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void close(signal).finally(() => process.exit(0)));
}
