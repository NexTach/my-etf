export type HoldingTradeState = {
  symbol: string;
  currency: string;
  quantity: number;
  lastPrice: number;
  averagePurchasePrice: number | null;
  purchaseExchangeRate: number | null;
};

export type HoldingTradeUpdate = {
  quantity: number;
  lastPrice: number;
  averagePurchasePrice?: number;
  purchaseExchangeRate?: number | null;
  profitLossRate?: number | null;
};

export interface HoldingTradeTransaction {
  find(): Promise<HoldingTradeState | null>;
  update(values: HoldingTradeUpdate): Promise<void>;
  delete(): Promise<void>;
}

export interface HoldingTradeRepository {
  withSymbolTransaction<T>(
    symbol: string,
    work: (transaction: HoldingTradeTransaction) => Promise<T>
  ): Promise<T>;
}

export type HoldingTradeResult =
  | { status: "not_found" | "insufficient_quantity" | "missing_exchange_rate" | "missing_cost_basis" }
  | { status: "updated" | "deleted" };

const MIN_REMAINING_QUANTITY = 0.0000001;

export class ApplyHoldingTradeService {
  constructor(private readonly repository: HoldingTradeRepository) {}

  execute(input: {
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    orderPrice: number;
    exchangeRate?: number;
  }): Promise<HoldingTradeResult> {
    const symbol = input.symbol.trim().toUpperCase();
    return this.repository.withSymbolTransaction(symbol, async (transaction) => {
      const holding = await transaction.find();
      if (!holding) return { status: "not_found" };

      if (input.side === "SELL") {
        const nextQuantity = holding.quantity - input.quantity;
        if (nextQuantity < -MIN_REMAINING_QUANTITY) return { status: "insufficient_quantity" };
        if (nextQuantity <= MIN_REMAINING_QUANTITY) {
          await transaction.delete();
          return { status: "deleted" };
        }
        const profitLossRate = holding.averagePurchasePrice && holding.averagePurchasePrice > 0
          ? (input.orderPrice - holding.averagePurchasePrice) / holding.averagePurchasePrice
          : null;
        await transaction.update({ quantity: nextQuantity, lastPrice: input.orderPrice, profitLossRate });
        return { status: "updated" };
      }

      if (!holding.averagePurchasePrice || holding.averagePurchasePrice <= 0) {
        return { status: "missing_cost_basis" };
      }

      const currentNativeCost = holding.averagePurchasePrice * holding.quantity;
      const tradeNativeCost = input.orderPrice * input.quantity;
      const nextQuantity = holding.quantity + input.quantity;
      const nextAveragePurchasePrice = (currentNativeCost + tradeNativeCost) / nextQuantity;
      let nextPurchaseExchangeRate: number | null | undefined = holding.purchaseExchangeRate;

      if (holding.currency === "USD") {
        if (!input.exchangeRate || !holding.purchaseExchangeRate) {
          return { status: "missing_exchange_rate" };
        }
        nextPurchaseExchangeRate =
          (currentNativeCost * holding.purchaseExchangeRate + tradeNativeCost * input.exchangeRate) /
          (currentNativeCost + tradeNativeCost);
      }

      await transaction.update({
        quantity: nextQuantity,
        lastPrice: input.orderPrice,
        averagePurchasePrice: nextAveragePurchasePrice,
        purchaseExchangeRate: holding.currency === "USD" ? nextPurchaseExchangeRate : null,
        profitLossRate: (input.orderPrice - nextAveragePurchasePrice) / nextAveragePurchasePrice
      });
      return { status: "updated" };
    });
  }
}
