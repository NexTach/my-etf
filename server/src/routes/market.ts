import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { fetchMarketQuote, searchSymbols } from "../infrastructure/market-data.js";

export async function registerMarketRoutes(app: FastifyInstance) {
  app.get("/api/market/search", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request) => {
    const parsed = z.object({ q: z.string().trim().max(120).default("") }).safeParse(request.query);
    if (!parsed.success || !parsed.data.q) return { results: [] };
    try {
      return { results: await searchSymbols(parsed.data.q) };
    } catch (error) {
      request.log.warn({ err: error instanceof Error ? error.message : "unknown" }, "Market search failed");
      return { results: [] };
    }
  });

  app.get("/api/market/quote", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const parsed = z.object({ symbol: z.string().trim().min(1).max(20) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_symbol" });
    const quote = await fetchMarketQuote(parsed.data.symbol);
    if (!quote) return reply.code(404).send({ quote: null });
    return { quote };
  });
}
