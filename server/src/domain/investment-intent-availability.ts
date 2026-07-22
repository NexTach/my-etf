import { PRODUCT_EXTERNAL_INVESTMENT_LIMIT_RATE } from "./product-policy.js";

export type InvestmentIntentAvailability = Readonly<{
  completedInvestmentIntentKrw: number;
  portfolioMarketValueKrw: number;
  maxCompletedInvestmentIntentKrw: number;
  isPaused: boolean;
}>;

function nonNegativeAmount(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

export function investmentIntentAvailabilityFromAmounts(
  completedInvestmentIntentKrw: number,
  portfolioMarketValueKrw: number
): InvestmentIntentAvailability {
  const completedAmount = nonNegativeAmount(completedInvestmentIntentKrw);
  const portfolioValue = nonNegativeAmount(portfolioMarketValueKrw);
  const maxCompletedInvestmentIntentKrw = portfolioValue * PRODUCT_EXTERNAL_INVESTMENT_LIMIT_RATE;

  return {
    completedInvestmentIntentKrw: completedAmount,
    portfolioMarketValueKrw: portfolioValue,
    maxCompletedInvestmentIntentKrw,
    isPaused: completedAmount > maxCompletedInvestmentIntentKrw
  };
}
