import type { DividendForecast, DividendForecastLine } from "./types";

export function forecastLinePaymentAmount(line: DividendForecastLine) {
  if (typeof line.annualDividendKrw !== "number") return undefined;
  if (line.expectedPaymentMonths.length === 0) return line.annualDividendKrw;
  return line.annualDividendKrw / line.expectedPaymentMonths.length;
}

function forecastLineMonthlyAmount(line: DividendForecastLine, month: number) {
  if (typeof line.annualDividendKrw !== "number") return undefined;
  if (line.expectedPaymentMonths.length === 0) {
    return line.monthlyAverageKrw ?? line.annualDividendKrw / 12;
  }
  return line.expectedPaymentMonths.includes(month)
    ? line.annualDividendKrw / line.expectedPaymentMonths.length
    : 0;
}

export function forecastMonthlyDividendKrw(forecast: DividendForecast, month: number) {
  if (forecast.dividendDataMissing) return undefined;

  let total = 0;
  for (const line of forecast.lines) {
    const amount = forecastLineMonthlyAmount(line, month);
    if (typeof amount !== "number") return undefined;
    total += amount;
  }
  return total;
}

export function dividendYieldFromAmount(dividendKrw: number | undefined, marketValueKrw: number) {
  return typeof dividendKrw === "number" && dividendKrw > 0 && marketValueKrw > 0
    ? dividendKrw / marketValueKrw
    : undefined;
}
