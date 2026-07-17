import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { monthlyDividendRecordId } from "../src/domain/monthly-dividend-record.js";

describe("Given a monthly dividend record UUID", () => {
  describe("when its record ID is generated", () => {
    it("then returns a stable ledger identifier", () => {
      assert.equal(
        monthlyDividendRecordId("123e4567-e89b-12d3-a456-426614174000"),
        "mdr_123e4567e89b12d3a456426614174000"
      );
    });
  });
});
