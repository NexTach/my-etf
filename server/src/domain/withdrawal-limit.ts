import type { AppStore } from "./types.js";

export type WithdrawalIntentReference = {
  completedNetInvestmentIntentKrw: number;
  pendingWithdrawalIntentKrw: number;
  maxRequestIntentKrw: number;
};

export function completedInvestmentIntentAmount(store: AppStore, userId: string) {
  return store.investmentIntents
    .filter((intent) => intent.userId === userId && intent.status === "COMPLETED")
    .reduce((sum, intent) => sum + intent.amountKrw, 0);
}

export function completedWithdrawalIntentAmount(store: AppStore, userId: string) {
  return store.withdrawalIntents
    .filter((intent) => intent.userId === userId && intent.status === "COMPLETED")
    .reduce((sum, intent) => sum + intent.amountKrw, 0);
}

export function pendingWithdrawalIntentAmount(store: AppStore, userId: string) {
  return store.withdrawalIntents
    .filter((intent) => intent.userId === userId && intent.status === "PENDING")
    .reduce((sum, intent) => sum + intent.amountKrw, 0);
}

export function withdrawalIntentReferenceFromAmounts(
  completedNetInvestmentIntentKrw: number,
  pendingWithdrawalIntentKrw = 0
): WithdrawalIntentReference {
  const completedNet = Math.max(0, Math.floor(completedNetInvestmentIntentKrw));
  const pending = Math.max(0, Math.floor(pendingWithdrawalIntentKrw));
  return {
    completedNetInvestmentIntentKrw: completedNet,
    pendingWithdrawalIntentKrw: pending,
    maxRequestIntentKrw: Math.max(completedNet - pending, 0)
  };
}

export function withdrawalIntentReferenceForUser(store: AppStore, userId: string) {
  const completedNet = Math.max(
    completedInvestmentIntentAmount(store, userId) - completedWithdrawalIntentAmount(store, userId),
    0
  );
  return withdrawalIntentReferenceFromAmounts(
    completedNet,
    pendingWithdrawalIntentAmount(store, userId)
  );
}
