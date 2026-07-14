import { withdrawalLimitFromPrincipal } from "../domain/withdrawal-limit.js";

export type WithdrawalRequestInput = {
  userId: string;
  userName: string;
  userEmail: string;
  amountKrw: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  contact: string;
  note?: string;
};

export interface WithdrawalTransaction {
  acceptedInvestmentPrincipal(): Promise<number>;
  acceptedWithdrawalAmount(): Promise<number>;
  pendingWithdrawalAmount(): Promise<number>;
  save(input: WithdrawalRequestInput): Promise<unknown>;
}

export interface WithdrawalRepository {
  withUserTransaction<T>(
    userId: string,
    work: (transaction: WithdrawalTransaction) => Promise<T>
  ): Promise<T>;
}

export class RequestWithdrawalService {
  constructor(private readonly repository: WithdrawalRepository) {}

  execute(input: WithdrawalRequestInput, drawdownRate: number) {
    return this.repository.withUserTransaction(input.userId, async (transaction) => {
      const [invested, withdrawn, pending] = await Promise.all([
        transaction.acceptedInvestmentPrincipal(),
        transaction.acceptedWithdrawalAmount(),
        transaction.pendingWithdrawalAmount()
      ]);
      const principal = Math.max(invested - withdrawn, 0);
      const limit = withdrawalLimitFromPrincipal(principal, drawdownRate, pending);
      if (principal <= 0 || input.amountKrw > limit.maxAmountKrw) {
        return { status: "limit_exceeded" as const, limit };
      }
      const intent = await transaction.save(input);
      return { status: "created" as const, limit, intent };
    });
  }
}
