import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApplyHoldingTradeService,
  type HoldingTradeRepository,
  type HoldingTradeState,
  type HoldingTradeUpdate
} from "../src/application/apply-holding-trade-service.js";

function serialRepository(initial: HoldingTradeState) {
  let state: HoldingTradeState | null = { ...initial };
  let queue = Promise.resolve();
  const updates: HoldingTradeUpdate[] = [];
  const repository: HoldingTradeRepository = {
    withSymbolTransaction(_symbol, work) {
      const operation = queue.then(() => work({
        async find() { return state ? { ...state } : null; },
        async update(values) {
          assert.ok(state);
          updates.push(values);
          state = { ...state, ...values };
        },
        async delete() { state = null; }
      }));
      queue = operation.then(() => undefined, () => undefined);
      return operation;
    }
  };
  return { repository, updates, state: () => state };
}

describe("ApplyHoldingTradeService", () => {
  describe("given ten shares and two concurrent sell requests for six shares", () => {
    describe("when transactions serialize on the holding", () => {
      it("then applies one sale and rejects the other without going negative", async () => {
        const fake = serialRepository({
          symbol: "SCHD",
          currency: "USD",
          quantity: 10,
          lastPrice: 20,
          averagePurchasePrice: 15,
          purchaseExchangeRate: 1300
        });
        const service = new ApplyHoldingTradeService(fake.repository);
        const results = await Promise.all([
          service.execute({ symbol: "SCHD", side: "SELL", quantity: 6, orderPrice: 20 }),
          service.execute({ symbol: "SCHD", side: "SELL", quantity: 6, orderPrice: 20 })
        ]);
        assert.deepEqual(results.map((result) => result.status).sort(), ["insufficient_quantity", "updated"]);
        assert.equal(fake.state()?.quantity, 4);
        assert.equal(fake.updates.length, 1);
      });
    });
  });

  describe("given an existing USD holding", () => {
    describe("when buying at a different price and exchange rate", () => {
      it("then updates weighted native cost and weighted KRW exchange cost", async () => {
        const fake = serialRepository({
          symbol: "SCHD",
          currency: "USD",
          quantity: 10,
          lastPrice: 10,
          averagePurchasePrice: 10,
          purchaseExchangeRate: 1000
        });
        const result = await new ApplyHoldingTradeService(fake.repository).execute({
          symbol: "SCHD",
          side: "BUY",
          quantity: 10,
          orderPrice: 20,
          exchangeRate: 1500
        });
        assert.equal(result.status, "updated");
        assert.equal(fake.state()?.quantity, 20);
        assert.equal(fake.state()?.averagePurchasePrice, 15);
        assert.equal(fake.state()?.purchaseExchangeRate, 400_000 / 300);
      });
    });
  });
});
