const USD_KRW_ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const FALLBACK_USD_KRW_RATE = 1380;
const REVALIDATE_SECONDS = 60 * 10;

type ExchangeRateApiResponse = {
  result?: string;
  time_last_update_utc?: string;
  rates?: {
    KRW?: number;
  };
};

export type ExchangeRateSnapshot = {
  pair: "USD/KRW";
  rate: number;
  fetchedAt: string;
  source: "open.er-api.com" | "fallback";
};

function validUsdKrwRate(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 500 && value <= 3000;
}

export async function fetchUsdKrwExchangeRate(): Promise<ExchangeRateSnapshot> {
  try {
    const response = await fetch(USD_KRW_ENDPOINT, {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS }
    });
    if (!response.ok) throw new Error(`Exchange rate fetch failed: ${response.status}`);

    const json = (await response.json()) as ExchangeRateApiResponse;
    const rate = json.rates?.KRW;
    if (json.result !== "success" || !validUsdKrwRate(rate)) {
      throw new Error("Exchange rate response did not contain a valid KRW rate");
    }

    return {
      pair: "USD/KRW",
      rate,
      fetchedAt: json.time_last_update_utc
        ? new Date(json.time_last_update_utc).toISOString()
        : new Date().toISOString(),
      source: "open.er-api.com"
    };
  } catch {
    return {
      pair: "USD/KRW",
      rate: FALLBACK_USD_KRW_RATE,
      fetchedAt: new Date().toISOString(),
      source: "fallback"
    };
  }
}
