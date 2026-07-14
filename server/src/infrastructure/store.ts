import type { AppStore, InvestmentIntent, IntentStatus, WithdrawalIntent } from "../domain/types.js";
import { RequestWithdrawalService, type WithdrawalRequestInput } from "../application/request-withdrawal-service.js";
import { UpdateIntentStatusService } from "../application/update-intent-status-service.js";
import { withMysqlNamedLock } from "./mysql-named-lock.js";
import { prisma } from "./prisma.js";

type InvestmentRow = Awaited<ReturnType<typeof prisma.investmentIntent.findMany>>[number];
type WithdrawalRow = Awaited<ReturnType<typeof prisma.withdrawalIntent.findMany>>[number];

function toInvestmentIntent(row: InvestmentRow) {
  return {
    ...row,
    note: row.note ?? undefined,
    type: "INVESTMENT" as const,
    status: row.status as IntentStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  } satisfies InvestmentIntent;
}

function toWithdrawalIntent(row: WithdrawalRow) {
  return {
    ...row,
    note: row.note ?? undefined,
    type: "WITHDRAWAL" as const,
    status: row.status as IntentStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  } satisfies WithdrawalIntent;
}

export async function readStore(): Promise<AppStore> {
  const [investmentRows, withdrawalRows] = await Promise.all([
    prisma.investmentIntent.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.withdrawalIntent.findMany({ orderBy: { createdAt: "desc" } })
  ]);

  return {
    investmentIntents: investmentRows.map((row) => toInvestmentIntent(row)),
    withdrawalIntents: withdrawalRows.map((row) => toWithdrawalIntent(row))
  };
}

export async function readStoreForUser(userId: string): Promise<AppStore> {
  const [investmentRows, withdrawalRows] = await Promise.all([
    prisma.investmentIntent.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.withdrawalIntent.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
  ]);
  return {
    investmentIntents: investmentRows.map((row) => toInvestmentIntent(row)),
    withdrawalIntents: withdrawalRows.map((row) => toWithdrawalIntent(row))
  };
}

export async function readAcceptedNetInvestmentPrincipal() {
  const [investments, withdrawals] = await Promise.all([
    prisma.investmentIntent.aggregate({
      where: { status: "ACCEPTED" },
      _sum: { amountKrw: true }
    }),
    prisma.withdrawalIntent.aggregate({
      where: { status: "ACCEPTED" },
      _sum: { amountKrw: true }
    })
  ]);

  return Math.max(
    (investments._sum.amountKrw ?? 0) - (withdrawals._sum.amountKrw ?? 0),
    0
  );
}

export async function createInvestmentIntent(
  input: Omit<InvestmentIntent, "id" | "type" | "status" | "createdAt" | "updatedAt">
) {
  const row = await prisma.investmentIntent.create({
    data: {
      ...input,
      status: "PENDING"
    }
  });
  return toInvestmentIntent(row);
}

export async function createWithdrawalIntent(
  input: Omit<WithdrawalIntent, "id" | "type" | "status" | "createdAt" | "updatedAt">
) {
  const row = await prisma.withdrawalIntent.create({
    data: {
      ...input,
      status: "PENDING"
    }
  });
  return toWithdrawalIntent(row);
}

export async function createWithdrawalIntentSafely(input: WithdrawalRequestInput, drawdownRate: number) {
  const service = new RequestWithdrawalService({
    withUserTransaction: (_userId, work) => prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM tb_investment_intents WHERE userId = ${input.userId} FOR UPDATE`;
      await transaction.$queryRaw`SELECT id FROM tb_withdrawal_intents WHERE userId = ${input.userId} FOR UPDATE`;
      return work({
        acceptedInvestmentPrincipal: async () => {
          const result = await transaction.investmentIntent.aggregate({
            where: { userId: input.userId, status: "ACCEPTED" },
            _sum: { amountKrw: true }
          });
          return result._sum.amountKrw ?? 0;
        },
        acceptedWithdrawalAmount: async () => {
          const result = await transaction.withdrawalIntent.aggregate({
            where: { userId: input.userId, status: "ACCEPTED" },
            _sum: { amountKrw: true }
          });
          return result._sum.amountKrw ?? 0;
        },
        pendingWithdrawalAmount: async () => {
          const result = await transaction.withdrawalIntent.aggregate({
            where: { userId: input.userId, status: "PENDING" },
            _sum: { amountKrw: true }
          });
          return result._sum.amountKrw ?? 0;
        },
        save: async (values) => {
          const row = await transaction.withdrawalIntent.create({ data: { ...values, status: "PENDING" } });
          return toWithdrawalIntent(row);
        }
      });
    }, { isolationLevel: "Serializable" })
  });

  const locked = await withMysqlNamedLock(
    `nxdi:intents:${input.userId}`,
    () => service.execute(input, drawdownRate),
    5
  );
  if (!locked.acquired) throw new Error("Could not acquire withdrawal lock");
  return locked.value;
}

export async function updateIntentStatus(params: {
  type: "INVESTMENT" | "WITHDRAWAL";
  id: string;
  status: IntentStatus;
}) {
  const owner = params.type === "INVESTMENT"
    ? await prisma.investmentIntent.findUnique({ where: { id: params.id }, select: { userId: true } })
    : await prisma.withdrawalIntent.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!owner) return { status: "not_found" as const };

  const service = new UpdateIntentStatusService({
    withIntentTransaction: (_input, work) => prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM tb_investment_intents WHERE userId = ${owner.userId} FOR UPDATE`;
      await transaction.$queryRaw`SELECT id FROM tb_withdrawal_intents WHERE userId = ${owner.userId} FOR UPDATE`;
      return work({
        findTarget: async () => {
          if (params.type === "INVESTMENT") {
            const row = await transaction.investmentIntent.findUnique({ where: { id: params.id } });
            return row ? { id: row.id, type: "INVESTMENT" as const, userId: row.userId, amountKrw: row.amountKrw, status: row.status } : null;
          }
          const row = await transaction.withdrawalIntent.findUnique({ where: { id: params.id } });
          return row ? { id: row.id, type: "WITHDRAWAL" as const, userId: row.userId, amountKrw: row.amountKrw, status: row.status } : null;
        },
        acceptedInvestmentAmountExcluding: async (id) => {
          const result = await transaction.investmentIntent.aggregate({
            where: { userId: owner.userId, status: "ACCEPTED", id: id ? { not: id } : undefined },
            _sum: { amountKrw: true }
          });
          return result._sum.amountKrw ?? 0;
        },
        acceptedWithdrawalAmountExcluding: async (id) => {
          const result = await transaction.withdrawalIntent.aggregate({
            where: { userId: owner.userId, status: "ACCEPTED", id: id ? { not: id } : undefined },
            _sum: { amountKrw: true }
          });
          return result._sum.amountKrw ?? 0;
        },
        update: async (status) => {
          if (params.type === "INVESTMENT") {
            return toInvestmentIntent(await transaction.investmentIntent.update({ where: { id: params.id }, data: { status } }));
          }
          return toWithdrawalIntent(await transaction.withdrawalIntent.update({ where: { id: params.id }, data: { status } }));
        }
      });
    }, { isolationLevel: "Serializable" })
  });

  const locked = await withMysqlNamedLock(
    `nxdi:intents:${owner.userId}`,
    () => service.execute(params),
    5
  );
  if (!locked.acquired) throw new Error("Could not acquire intent status lock");
  return locked.value;
}
