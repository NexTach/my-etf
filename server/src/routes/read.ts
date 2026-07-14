import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { isAdminUser } from "../auth/admin.js";
import { requestUser } from "../auth/session.js";
import {
  METRIC_SLUGS,
  adminDashboardReadModel,
  disclosureReadModel,
  disclosuresReadModel,
  intentsReadModel,
  metricReadModel,
  publicHomeReadModel,
  simulationReadModel,
  stockReadModel
} from "../application/read-models.js";

export type ReadModels = {
  publicHome: typeof publicHomeReadModel;
  disclosures: typeof disclosuresReadModel;
  disclosure: typeof disclosureReadModel;
  stock: typeof stockReadModel;
  metric: typeof metricReadModel;
  simulation: typeof simulationReadModel;
  intents: typeof intentsReadModel;
  adminDashboard: typeof adminDashboardReadModel;
};

export const defaultReadModels: ReadModels = {
  publicHome: publicHomeReadModel,
  disclosures: disclosuresReadModel,
  disclosure: disclosureReadModel,
  stock: stockReadModel,
  metric: metricReadModel,
  simulation: simulationReadModel,
  intents: intentsReadModel,
  adminDashboard: adminDashboardReadModel
};

export async function registerReadRoutes(app: FastifyInstance, models: ReadModels) {
  app.get("/api/auth/session", async (request) => {
    const user = requestUser(request);
    return { user, isAdmin: isAdminUser(user) };
  });

  app.get("/api/public/home", async (request) => {
    const user = requestUser(request);
    return { user, isAdmin: isAdminUser(user), ...(await models.publicHome()) };
  });

  app.get("/api/disclosures", async (request) => {
    const user = requestUser(request);
    return { user, ...(await models.disclosures()) };
  });

  app.get("/api/disclosures/:id", async (request, reply) => {
    const parsed = z.object({ id: z.string().trim().min(1).max(64) }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_disclosure_id" });
    const disclosure = await models.disclosure(parsed.data.id);
    if (!disclosure) return reply.code(404).send({ error: "not_found" });
    return { user: requestUser(request), disclosure };
  });

  app.get("/api/stocks/:symbol", async (request, reply) => {
    const parsed = z.object({ symbol: z.string().trim().min(1).max(20) }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_symbol" });
    const model = await models.stock(decodeURIComponent(parsed.data.symbol));
    if (!model) return reply.code(404).send({ error: "not_found" });
    return { user: requestUser(request), ...model };
  });

  app.get("/api/metrics/:metric", async (request, reply) => {
    const parsed = z.object({ metric: z.enum(METRIC_SLUGS) }).safeParse(request.params);
    if (!parsed.success) return reply.code(404).send({ error: "not_found" });
    return { user: requestUser(request), ...(await models.metric(parsed.data.metric)) };
  });

  app.get("/api/simulation", async (request) => {
    const parsed = z.object({
      amount: z.coerce.number().optional(),
      amountKrw: z.coerce.number().optional()
    }).safeParse(request.query);
    const amount = parsed.success ? parsed.data.amount ?? parsed.data.amountKrw ?? 100_000 : 100_000;
    return { user: requestUser(request), ...(await models.simulation(amount)) };
  });

  app.get("/api/intents/me", async (request, reply) => {
    const user = requestUser(request);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { user, ...(await models.intents(user.id)) };
  });

  app.get("/api/admin/dashboard", async (request, reply) => {
    const user = requestUser(request);
    if (!isAdminUser(user)) return reply.code(403).send({ error: "forbidden" });
    return { user, ...(await models.adminDashboard()) };
  });
}
