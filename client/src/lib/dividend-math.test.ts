import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dividendYieldFromAmount, forecastMonthlyDividendKrw } from "./dividend-math";
import type { DividendForecast } from "./types";

const forecast: DividendForecast = {
  amountKrw: 100000,
  annualDividendKrw: 12000,
  monthlyAverageKrw: 1000,
  dividendDataMissing: false,
  lines: [
    {
      symbol: "A",
      name: "A",
      marketCountry: "KOSPI",
      currency: "KRW",
      allocationKrw: 60000,
      estimatedQuantity: 1,
      annualDividendKrw: 12000,
      monthlyAverageKrw: 1000,
      expectedPaymentMonths: [3, 6, 9, 12]
    },
    {
      symbol: "B",
      name: "B",
      marketCountry: "KOSPI",
      currency: "KRW",
      allocationKrw: 40000,
      estimatedQuantity: 1,
      annualDividendKrw: 1200,
      monthlyAverageKrw: 100,
      expectedPaymentMonths: []
    }
  ]
};

describe("forecastMonthlyDividendKrw", () => {
  it("estimates the selected month from scheduled and unscheduled annual dividends", () => {
    assert.equal(forecastMonthlyDividendKrw(forecast, 6), 3100);
    assert.equal(forecastMonthlyDividendKrw(forecast, 7), 100);
  });

  it("does not estimate when dividend data is incomplete", () => {
    assert.equal(forecastMonthlyDividendKrw({ ...forecast, dividendDataMissing: true }, 6), undefined);
  });
});

describe("dividendYieldFromAmount", () => {
  it("divides dividend amount by market value", () => {
    assert.equal(dividendYieldFromAmount(2500, 1000000), 0.0025);
  });
});
