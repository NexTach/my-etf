import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RequestWithdrawalService,
  type WithdrawalRepository,
  type WithdrawalRequestInput
} from "../src/application/request-withdrawal-service.js";

const request: WithdrawalRequestInput = {
  userId: "user-1",
  userName: "홍길동",
  userEmail: "user@example.com",
  amountKrw: 80_000,
  bankName: "은행",
  accountNumber: "123456789",
  accountHolder: "홍길동",
  contact: "010-0000-0000"
};

function repository(values: { invested: number; withdrawn?: number; pending?: number }) {
  const saved: WithdrawalRequestInput[] = [];
  const fake: WithdrawalRepository = {
    async withUserTransaction(_userId, work) {
      return work({
        async acceptedInvestmentPrincipal() { return values.invested; },
        async acceptedWithdrawalAmount() { return values.withdrawn ?? 0; },
        async pendingWithdrawalAmount() { return values.pending ?? 0; },
        async save(input) { saved.push(input); return input; }
      });
    }
  };
  return { fake, saved };
}

describe("RequestWithdrawalService", () => {
  describe("given accepted principal, a drawdown, and a pending withdrawal", () => {
    describe("when the requested amount exceeds the recalculated available limit", () => {
      it("then rejects without saving an intent", async () => {
        const { fake, saved } = repository({ invested: 100_000, pending: 20_000 });
        const result = await new RequestWithdrawalService(fake).execute(request, -0.1);
        assert.equal(result.status, "limit_exceeded");
        assert.equal(result.limit.maxAmountKrw, 70_000);
        assert.equal(saved.length, 0);
      });
    });
  });

  describe("given enough net principal after accepted withdrawals", () => {
    describe("when a valid withdrawal is requested", () => {
      it("then saves exactly one pending intent", async () => {
        const { fake, saved } = repository({ invested: 200_000, withdrawn: 20_000, pending: 10_000 });
        const result = await new RequestWithdrawalService(fake).execute({ ...request, amountKrw: 100_000 }, 0);
        assert.equal(result.status, "created");
        assert.equal(result.limit.maxAmountKrw, 170_000);
        assert.deepEqual(saved, [{ ...request, amountKrw: 100_000 }]);
      });
    });
  });
});
