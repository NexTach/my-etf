const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DIVIDEND_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function dividendAcceptanceMonth(acceptedAt: string) {
  const acceptedDate = new Date(acceptedAt);
  if (Number.isNaN(acceptedDate.getTime())) return undefined;
  return new Date(acceptedDate.getTime() + KST_OFFSET_MS).toISOString().slice(0, 7);
}

export function dividendEligibleFromMonth(acceptedAt: string) {
  const acceptanceMonth = dividendAcceptanceMonth(acceptedAt);
  if (!acceptanceMonth) return undefined;

  const year = Number(acceptanceMonth.slice(0, 4));
  const month = Number(acceptanceMonth.slice(5, 7));
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function isEligibleForDividendMonth(acceptedAt: string, dividendMonth: string) {
  if (!DIVIDEND_MONTH_PATTERN.test(dividendMonth)) return false;
  const eligibleFromMonth = dividendEligibleFromMonth(acceptedAt);
  return typeof eligibleFromMonth === "string" && eligibleFromMonth <= dividendMonth;
}

export function eligibleDividendIntents<T extends { updatedAt: string }>(
  intents: readonly T[],
  dividendMonth: string
) {
  return intents.filter((intent) => isEligibleForDividendMonth(intent.updatedAt, dividendMonth));
}
