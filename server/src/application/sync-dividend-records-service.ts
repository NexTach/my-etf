import type { DividendRecord } from "../domain/types.js";
import { mapWithConcurrency } from "../infrastructure/concurrency.js";

export type ExistingDividendRecord = { symbol: string; memo?: string; updatedAt: Date };

export interface DividendSyncRepository {
  find(symbol: string): Promise<ExistingDividendRecord | null>;
  save(record: DividendRecord): Promise<void>;
}

export interface DividendMarketGateway {
  fetch(symbol: string): Promise<DividendRecord | null>;
}

export class SyncDividendRecordsService {
  constructor(
    private readonly repository: DividendSyncRepository,
    private readonly gateway: DividendMarketGateway,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(symbols: readonly string[]) {
    const unique = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
    return mapWithConcurrency(unique, 3, async (symbol) => {
      const existing = await this.repository.find(symbol);
      const marketBacked = Boolean(existing?.memo && /Yahoo|FMP|OpenDART/.test(existing.memo));
      if (existing && !marketBacked) return { symbol, status: "manual" as const };
      if (existing && this.now().getTime() - existing.updatedAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return { symbol, status: "fresh" as const };
      }
      const record = await this.gateway.fetch(symbol);
      if (!record) return { symbol, status: "not_found" as const };
      await this.repository.save(record);
      return { symbol, status: "updated" as const };
    });
  }
}
