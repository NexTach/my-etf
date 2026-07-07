import type { AppStore, PortfolioOverview } from "./types";

export type WithdrawalLimit = {
  principalKrw: number;
  drawdownRate: number;
  maxAmountKrw: number;
};

function portfolioCostBasisKrw(portfolio: PortfolioOverview) {
  return portfolio.holdings.reduce((sum, holding) => {
    if (typeof holding.costBasisKrw === "number") return sum + holding.costBasisKrw;
    if (!holding.averagePurchasePrice || holding.averagePurchasePrice <= 0) return sum;

    const purchaseExchangeRate = holding.purchaseExchangeRate ?? portfolio.exchangeRate;
    const nativeCost = holding.averagePurchasePrice * holding.quantity;
    return sum + (holding.currency === "USD" ? nativeCost * purchaseExchangeRate : nativeCost);
  }, 0);
}

export function acceptedInvestmentPrincipal(store: AppStore, userId: string) {
  return store.investmentIntents
    .filter((intent) => intent.userId === userId && intent.status === "ACCEPTED")
    .reduce((sum, intent) => sum + intent.amountKrw, 0);
}

export function portfolioDrawdownRate(portfolio: PortfolioOverview) {
  const costBasisKrw = portfolioCostBasisKrw(portfolio);
  if (costBasisKrw <= 0) return 0;

  return Math.min(0, (portfolio.totalMarketValueKrw - costBasisKrw) / costBasisKrw);
}

export function withdrawalLimitFromPrincipal(principalKrw: number, drawdownRate: number): WithdrawalLimit {
  const normalizedPrincipal = Math.max(0, Math.floor(principalKrw));
  const normalizedDrawdown = Math.min(0, Math.max(-1, drawdownRate));
  const maxAmountKrw = Math.floor(normalizedPrincipal * (1 + normalizedDrawdown));

  return {
    principalKrw: normalizedPrincipal,
    drawdownRate: normalizedDrawdown,
    maxAmountKrw: Math.max(0, Math.min(normalizedPrincipal, maxAmountKrw))
  };
}

export function withdrawalLimitForUser(store: AppStore, portfolio: PortfolioOverview, userId: string) {
  return withdrawalLimitFromPrincipal(acceptedInvestmentPrincipal(store, userId), portfolioDrawdownRate(portfolio));
}
