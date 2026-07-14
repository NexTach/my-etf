import type { InvestmentIntent } from "../domain/types.js";

export interface InvestmentIntentRepository {
  create(input: Omit<InvestmentIntent, "id" | "type" | "status" | "createdAt" | "updatedAt">): Promise<InvestmentIntent>;
}

export class RequestInvestmentService {
  constructor(private readonly repository: InvestmentIntentRepository) {}

  execute(input: Omit<InvestmentIntent, "id" | "type" | "status" | "createdAt" | "updatedAt">) {
    return this.repository.create(input);
  }
}
