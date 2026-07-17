import {
  dividendCompletionMonth,
  isEligibleForDividendMonth
} from "../domain/dividend-eligibility.js";

type PrincipalEntry = {
  id: string;
  userId: string;
  amountKrw: number;
  completedAt: string;
};

export type CalculateDividendPrincipalInput = {
  dividendMonth: string;
  investments: PrincipalEntry[];
  withdrawals: PrincipalEntry[];
};

export class CalculateDividendPrincipalService {
  execute(input: CalculateDividendPrincipalInput) {
    const eligibleInvestments = input.investments
      .filter((investment) => isEligibleForDividendMonth(investment.completedAt, input.dividendMonth))
      .map((investment) => ({ ...investment, amountKrw: Math.max(0, investment.amountKrw) }));

    const withdrawalsByUser = new Map<string, number>();
    for (const withdrawal of input.withdrawals) {
      const completionMonth = dividendCompletionMonth(withdrawal.completedAt);
      if (!completionMonth || completionMonth > input.dividendMonth) continue;
      withdrawalsByUser.set(
        withdrawal.userId,
        (withdrawalsByUser.get(withdrawal.userId) ?? 0) + Math.max(0, withdrawal.amountKrw)
      );
    }

    const investmentsByUser = new Map<string, typeof eligibleInvestments>();
    for (const investment of eligibleInvestments) {
      const entries = investmentsByUser.get(investment.userId) ?? [];
      entries.push(investment);
      investmentsByUser.set(investment.userId, entries);
    }

    const result: typeof eligibleInvestments = [];
    for (const [userId, investments] of investmentsByUser) {
      let remainingWithdrawal = withdrawalsByUser.get(userId) ?? 0;
      const fifoInvestments = investments.sort((left, right) =>
        left.completedAt.localeCompare(right.completedAt) || left.id.localeCompare(right.id)
      );
      for (const investment of fifoInvestments) {
        const deducted = Math.min(investment.amountKrw, remainingWithdrawal);
        const amountKrw = investment.amountKrw - deducted;
        remainingWithdrawal -= deducted;
        if (amountKrw > 0) result.push({ ...investment, amountKrw });
      }
    }

    return result;
  }
}
