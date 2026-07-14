import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { encodeSession } from "../src/auth/session.js";
import type { ReadModels } from "../src/routes/read.js";

const apps: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function appWith(options: Parameters<typeof buildApp>[0] = {}) {
  const app = await buildApp(options);
  apps.push(app);
  return app;
}

describe("Fastify route smoke tests", () => {
  describe("given a running server", () => {
    describe("when health is requested", () => {
      it("then reports the server as healthy", async () => {
        const app = await appWith({ healthCheck: async () => undefined });
        const response = await app.inject({ method: "GET", url: "/health" });
        assert.equal(response.statusCode, 200);
        assert.equal(response.json().status, "ok");
        assert.equal(response.json().database, "ok");
      });
    });
  });

  describe("given an unauthenticated request", () => {
    describe("when the admin dashboard is requested", () => {
      it("then rejects before querying the dashboard read model", async () => {
        let calls = 0;
        const app = await appWith({ readModels: { adminDashboard: (async () => { calls += 1; throw new Error("unexpected"); }) as ReadModels["adminDashboard"] } });
        const response = await app.inject({ method: "GET", url: "/api/admin/dashboard" });
        assert.equal(response.statusCode, 403);
        assert.equal(calls, 0);
      });
    });
  });

  describe("given a malformed market quote request", () => {
    describe("when symbol is missing", () => {
      it("then returns a normalized validation response", async () => {
        const app = await appWith();
        const response = await app.inject({ method: "GET", url: "/api/market/quote" });
        assert.equal(response.statusCode, 400);
        assert.equal(response.json().error, "invalid_symbol");
      });
    });
  });

  describe("given an authenticated user", () => {
    describe("when their intents are requested", () => {
      it("then scopes the read model by the signed session user id", async () => {
        process.env.APP_SESSION_SECRET = "test-session-secret-with-more-than-32-characters";
        let requestedUserId = "";
        const intents = (async (userId: string) => {
          requestedUserId = userId;
          return {
            store: { investmentIntents: [], withdrawalIntents: [] },
            portfolio: {
              source: "manual" as const,
              fetchedAt: new Date().toISOString(),
              exchangeRate: 1380,
              exchangeRateFetchedAt: new Date().toISOString(),
              exchangeRateSource: "test",
              totalMarketValueKrw: 0,
              dailySnapshots: [],
              holdings: []
            },
            withdrawalLimit: { principalKrw: 0, pendingWithdrawalKrw: 0, drawdownRate: 0, maxAmountKrw: 0 }
          };
        }) as ReadModels["intents"];
        const app = await appWith({ readModels: { intents } });
        const token = encodeSession({
          id: "only-this-user",
          email: "user@example.com",
          name: "사용자",
          role: "STUDENT",
          userType: "student"
        });
        const response = await app.inject({
          method: "GET",
          url: "/api/intents/me",
          cookies: { nxdi_session: token }
        });
        assert.equal(response.statusCode, 200);
        assert.equal(requestedUserId, "only-this-user");
        assert.equal(response.json().user.id, "only-this-user");
      });
    });
  });
});
