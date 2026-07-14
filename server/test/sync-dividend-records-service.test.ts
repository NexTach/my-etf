import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SyncDividendRecordsService } from "../src/application/sync-dividend-records-service.js";
import type { DividendRecord } from "../src/domain/types.js";

const marketRecord: DividendRecord = {
  symbol: "SCHD",
  currency: "USD",
  annualDividendPerShare: 2.5,
  expectedPaymentMonths: [3, 6, 9, 12],
  memo: "Yahoo Finance 배당 이력"
};

describe("SyncDividendRecordsService", () => {
  describe("given a manually maintained dividend record", () => {
    describe("when scheduled synchronization runs", () => {
      it("then preserves the manual value without calling the market gateway", async () => {
        let gatewayCalls = 0;
        let saves = 0;
        const service = new SyncDividendRecordsService({
          async find() { return { symbol: "SCHD", memo: "관리자 수동 입력", updatedAt: new Date(0) }; },
          async save() { saves += 1; }
        }, {
          async fetch() { gatewayCalls += 1; return marketRecord; }
        });
        const result = await service.execute(["schd"]);
        assert.equal(result[0]?.status, "manual");
        assert.equal(gatewayCalls, 0);
        assert.equal(saves, 0);
      });
    });
  });

  describe("given a stale market-backed record", () => {
    describe("when synchronization succeeds", () => {
      it("then stores the refreshed market value", async () => {
        const saved: DividendRecord[] = [];
        const service = new SyncDividendRecordsService({
          async find() { return { symbol: "SCHD", memo: "Yahoo Finance", updatedAt: new Date("2026-01-01") }; },
          async save(record) { saved.push(record); }
        }, { async fetch() { return marketRecord; } }, () => new Date("2026-07-14"));
        const result = await service.execute(["SCHD", "schd"]);
        assert.equal(result[0]?.status, "updated");
        assert.deepEqual(saved, [marketRecord]);
      });
    });
  });
});
