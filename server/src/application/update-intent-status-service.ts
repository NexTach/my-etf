export type IntentKind = "INVESTMENT" | "WITHDRAWAL";
export type IntentStatusValue = "PENDING" | "COMPLETED" | "REJECTED";

export type StatusIntent = {
  id: string;
  type: IntentKind;
  userId: string;
  amountKrw: number;
  status: string;
};

export interface IntentStatusTransaction {
  findTarget(): Promise<StatusIntent | null>;
  completedInvestmentAmountExcluding(id?: string): Promise<number>;
  completedWithdrawalAmountExcluding(id?: string): Promise<number>;
  update(status: IntentStatusValue): Promise<unknown>;
}

export interface IntentStatusRepository {
  withIntentTransaction<T>(
    input: { type: IntentKind; id: string },
    work: (transaction: IntentStatusTransaction) => Promise<T>
  ): Promise<T>;
}

export class UpdateIntentStatusService {
  constructor(private readonly repository: IntentStatusRepository) {}

  execute(input: { type: IntentKind; id: string; status: IntentStatusValue }) {
    return this.repository.withIntentTransaction(input, async (transaction) => {
      const target = await transaction.findTarget();
      if (!target) return { status: "not_found" as const };

      const [completedInvestments, completedWithdrawals] = await Promise.all([
        transaction.completedInvestmentAmountExcluding(target.type === "INVESTMENT" ? target.id : undefined),
        transaction.completedWithdrawalAmountExcluding(target.type === "WITHDRAWAL" ? target.id : undefined)
      ]);
      const hypotheticalInvestments = completedInvestments +
        (target.type === "INVESTMENT" && input.status === "COMPLETED" ? target.amountKrw : 0);
      const hypotheticalWithdrawals = completedWithdrawals +
        (target.type === "WITHDRAWAL" && input.status === "COMPLETED" ? target.amountKrw : 0);

      if (hypotheticalWithdrawals > hypotheticalInvestments) {
        return {
          status: "principal_invariant" as const,
          completedInvestmentKrw: hypotheticalInvestments,
          completedWithdrawalKrw: hypotheticalWithdrawals
        };
      }
      if (target.status === input.status) return { status: "unchanged" as const, intent: target };
      return { status: "updated" as const, intent: await transaction.update(input.status) };
    });
  }
}
