import type { InvestmentIntent } from "../domain/types.js";
import { investmentIntentAvailabilityFromAmounts } from "../domain/investment-intent-availability.js";

export type InvestmentRequestInput = Omit<
  InvestmentIntent,
  "id" | "type" | "status" | "createdAt" | "updatedAt"
>;

export interface InvestmentIntentRepository {
  completedInvestmentIntentAmount(): Promise<number>;
  portfolioMarketValueKrw(): Promise<number>;
  create(input: InvestmentRequestInput): Promise<InvestmentIntent>;
}

export class RequestInvestmentService {
  constructor(private readonly repository: InvestmentIntentRepository) {}

  async execute(input: InvestmentRequestInput) {
    const [completedInvestmentIntentKrw, portfolioMarketValueKrw] = await Promise.all([
      this.repository.completedInvestmentIntentAmount(),
      this.repository.portfolioMarketValueKrw()
    ]);
    const availability = investmentIntentAvailabilityFromAmounts(
      completedInvestmentIntentKrw,
      portfolioMarketValueKrw
    );

    if (availability.isPaused) return { status: "paused" as const, availability };

    return {
      status: "created" as const,
      availability,
      intent: await this.repository.create(input)
    };
  }
}
