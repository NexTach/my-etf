import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UpdateIntentStatusService,
  type IntentStatusRepository,
  type StatusIntent
} from "../src/application/update-intent-status-service.js";

function repository(input: {
  target: StatusIntent;
  completedInvestmentsExcluding: number;
  completedWithdrawalsExcluding: number;
}) {
  const updates: string[] = [];
  const fake: IntentStatusRepository = {
    async withIntentTransaction(_intent, work) {
      return work({
        async findTarget() { return input.target; },
        async completedInvestmentAmountExcluding() { return input.completedInvestmentsExcluding; },
        async completedWithdrawalAmountExcluding() { return input.completedWithdrawalsExcluding; },
        async update(status) { updates.push(status); return { ...input.target, status }; }
      });
    }
  };
  return { fake, updates };
}

describe("UpdateIntentStatusService", () => {
  describe("given completed withdrawal intentions backed by two completed investment intentions", () => {
    describe("when an admin tries to reject one investment below the withdrawn amount", () => {
      it("then rejects the transition without updating the intent", async () => {
        const { fake, updates } = repository({
          target: { id: "investment-2", type: "INVESTMENT", userId: "user-1", amountKrw: 50_000, status: "COMPLETED" },
          completedInvestmentsExcluding: 50_000,
          completedWithdrawalsExcluding: 80_000
        });
        const result = await new UpdateIntentStatusService(fake).execute({
          type: "INVESTMENT",
          id: "investment-2",
          status: "REJECTED"
        });
        assert.equal(result.status, "principal_invariant");
        assert.equal(updates.length, 0);
      });
    });
  });

  describe("given completed withdrawal intentions close to the completed investment intention amount", () => {
    describe("when an admin completes another withdrawal beyond that principal", () => {
      it("then rejects the transition without updating the intent", async () => {
        const { fake, updates } = repository({
          target: { id: "withdrawal-2", type: "WITHDRAWAL", userId: "user-1", amountKrw: 30_000, status: "PENDING" },
          completedInvestmentsExcluding: 100_000,
          completedWithdrawalsExcluding: 80_000
        });
        const result = await new UpdateIntentStatusService(fake).execute({
          type: "WITHDRAWAL",
          id: "withdrawal-2",
          status: "COMPLETED"
        });
        assert.equal(result.status, "principal_invariant");
        assert.equal(updates.length, 0);
      });
    });
  });

  describe("given a pending investment intention that increases the remaining intention reference", () => {
    describe("when an admin completes it without violating the invariant", () => {
      it("then updates the intent once", async () => {
        const { fake, updates } = repository({
          target: { id: "investment-2", type: "INVESTMENT", userId: "user-1", amountKrw: 50_000, status: "PENDING" },
          completedInvestmentsExcluding: 50_000,
          completedWithdrawalsExcluding: 40_000
        });
        const result = await new UpdateIntentStatusService(fake).execute({
          type: "INVESTMENT",
          id: "investment-2",
          status: "COMPLETED"
        });
        assert.equal(result.status, "updated");
        assert.deepEqual(updates, ["COMPLETED"]);
      });
    });
  });

});
