import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateDividendAllocation,
  calculateExpectedInvestorDividend,
  PRODUCT_ANNUAL_INVESTOR_DIVIDEND_CAP_RATE
} from "../src/domain/dividend-allocation.js";

describe("DividendAllocationPolicy", () => {
  describe("given investor and company principal with a company transfer allowance", () => {
    describe("when the investor base dividend is below the monthly cap", () => {
      it("then transfers only the allowed portion of the company dividend and allocates by investor weight", () => {
        const result = calculateDividendAllocation({
          actualDividendKrw: 1_000,
          selectedInvestmentKrw: 60_000,
          investorPrincipalKrw: 120_000,
          totalMarketValueKrw: 1_000_000
        });
        assert.equal(result.investorBaseDividendKrw, 120);
        assert.equal(result.companyTransferredDividendKrw, 176);
        assert.equal(result.investorDistributionPoolKrw, 296);
        assert.equal(result.allocationKrw, 148);
      });
    });
  });

  describe("given a high-yield portfolio", () => {
    describe("when expected investor payout is projected", () => {
      it("then never exceeds the product annual payout cap", () => {
        const result = calculateExpectedInvestorDividend({
          investmentKrw: 100_000,
          currentPortfolioMarketValueKrw: 1_000_000,
          annualPortfolioDividendYield: 0.12
        });
        assert.ok(result.expectedAnnualPayoutRate !== undefined);
        assert.ok(result.expectedAnnualPayoutRate <= PRODUCT_ANNUAL_INVESTOR_DIVIDEND_CAP_RATE);
      });
    });
  });
});
