import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requestUser } from "../auth/session.js";
import { PRODUCT_MAX_INVESTMENT_KRW, PRODUCT_MIN_INVESTMENT_KRW } from "../domain/product-policy.js";
import { portfolioDrawdownRate } from "../domain/withdrawal-limit.js";
import { getManualPortfolioOverview } from "../infrastructure/portfolio-store.js";
import { createInvestmentIntent, createWithdrawalIntentSafely } from "../infrastructure/store.js";
import { errorFlash, redirectWithFlash, successFlash } from "../http/flash.js";

const investmentSchema = z.object({
  amountKrw: z.coerce.number().int().min(PRODUCT_MIN_INVESTMENT_KRW).max(PRODUCT_MAX_INVESTMENT_KRW),
  depositorName: z.string().trim().min(1).max(30),
  contact: z.string().trim().min(4).max(80),
  guardianConfirmed: z.coerce.boolean().default(false),
  termsAgreed: z.literal("true"),
  dividendPolicyAgreed: z.literal("true"),
  note: z.string().max(500).optional()
});

const withdrawalSchema = z.object({
  amountKrw: z.coerce.number().int().positive().max(100_000_000),
  bankName: z.string().trim().min(1).max(30),
  accountNumber: z.string().trim().min(5).max(40),
  accountHolder: z.string().trim().min(1).max(30),
  contact: z.string().trim().min(4).max(80),
  termsAgreed: z.literal("true"),
  note: z.string().max(500).optional()
});

function requireUser(request: Parameters<typeof requestUser>[0], reply: Parameters<typeof redirectWithFlash>[0]) {
  const user = requestUser(request);
  if (!user) redirectWithFlash(reply, "/intents", errorFlash("login_required"));
  return user;
}

export async function registerIntentRoutes(app: FastifyInstance) {
  app.post("/api/intents/invest", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return reply;
    const parsed = investmentSchema.safeParse(request.body);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((item) => item.path[0] === "termsAgreed" || item.path[0] === "dividendPolicyAgreed");
      return redirectWithFlash(reply, "/intents", errorFlash(String(issue?.path[0] === "termsAgreed" ? "terms_required" : issue ? "dividend_policy_required" : "invalid_investment")));
    }
    await createInvestmentIntent({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      amountKrw: parsed.data.amountKrw,
      depositorName: parsed.data.depositorName,
      contact: parsed.data.contact,
      guardianConfirmed: parsed.data.guardianConfirmed,
      dividendPolicyAgreed: true,
      note: parsed.data.note
    });
    return redirectWithFlash(reply, "/intents", successFlash("intent-submitted", "의향서가 제출되었습니다"));
  });

  app.post("/api/intents/withdraw", async (request, reply) => {
    const user = requireUser(request, reply);
    if (!user) return reply;
    const parsed = withdrawalSchema.safeParse(request.body);
    if (!parsed.success) {
      const terms = parsed.error.issues.some((item) => item.path[0] === "termsAgreed");
      return redirectWithFlash(reply, "/intents", errorFlash(terms ? "terms_required" : "invalid_withdrawal"));
    }
    const portfolio = await getManualPortfolioOverview();
    const result = await createWithdrawalIntentSafely({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      amountKrw: parsed.data.amountKrw,
      bankName: parsed.data.bankName,
      accountNumber: parsed.data.accountNumber,
      accountHolder: parsed.data.accountHolder,
      contact: parsed.data.contact,
      note: parsed.data.note
    }, portfolioDrawdownRate(portfolio));
    if (result.status === "limit_exceeded") {
      return redirectWithFlash(reply, "/intents", errorFlash("withdrawal_limit"));
    }
    return redirectWithFlash(reply, "/intents", successFlash("intent-submitted", "의향서가 제출되었습니다"));
  });
}
