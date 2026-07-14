import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PortfolioSnapshotService, type SnapshotState } from "../src/application/portfolio-snapshot-service.js";

describe("PortfolioSnapshotService", () => {
  describe("given an open snapshot", () => {
    describe("when finalize runs", () => {
      it("then copies the latest values and closes it exactly once", async () => {
        const closedAt = new Date("2026-07-14T00:10:00.000Z");
        const writes: Array<{ date: string; closedAt: Date }> = [];
        const service = new PortfolioSnapshotService({
          async find() {
            return { totalMarketValueKrw: 1_000_000, exchangeRate: 1380, costBasisKrw: 900_000, annualDividendKrw: 80_000, closedAt: null };
          },
          async close(date, values) { writes.push({ date, closedAt: values.closedAt }); return true; }
        }, () => closedAt);
        const result = await service.finalize("2026-07-13");
        assert.equal(result.status, "closed");
        assert.deepEqual(writes, [{ date: "2026-07-13", closedAt }]);
      });
    });
  });

  describe("given a snapshot that is already finalized", () => {
    describe("when finalize runs again", () => {
      it("then retains the original closedAt and performs no write", async () => {
        const originalClosedAt = new Date("2026-07-13T15:10:00.000Z");
        const snapshot: SnapshotState = {
          totalMarketValueKrw: 1_000_000,
          exchangeRate: 1380,
          costBasisKrw: 900_000,
          annualDividendKrw: 80_000,
          closedAt: originalClosedAt
        };
        let writes = 0;
        const service = new PortfolioSnapshotService({
          async find() { return snapshot; },
          async close() { writes += 1; return true; }
        }, () => new Date("2026-07-14T00:10:00.000Z"));
        const result = await service.finalize("2026-07-13");
        assert.equal(result.status, "already_closed");
        assert.equal(result.closedAt, originalClosedAt);
        assert.equal(writes, 0);
      });
    });
  });
});
