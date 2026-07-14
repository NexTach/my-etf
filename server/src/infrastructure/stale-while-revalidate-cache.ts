import { TtlCache } from "./ttl-cache.js";

type StaleWhileRevalidateCacheOptions = {
  freshTtlMs: number;
  staleTtlMs: number;
  negativeTtlMs?: number;
  backgroundConcurrency?: number;
  now?: () => number;
  onBackgroundError?: (error: unknown, key: string) => void;
};

export class StaleWhileRevalidateCache<T> {
  readonly #fresh: TtlCache<T | null>;
  readonly #stale: TtlCache<T>;
  readonly #retryBackoff: TtlCache<boolean>;
  readonly #requests = new Map<string, Promise<T | null>>();
  readonly #freshTtlMs: number;
  readonly #staleTtlMs: number;
  readonly #negativeTtlMs: number;
  readonly #backgroundConcurrency: number;
  readonly #onBackgroundError?: (error: unknown, key: string) => void;
  readonly #backgroundWaiters: Array<() => void> = [];
  #activeBackgroundRequests = 0;

  constructor({
    freshTtlMs,
    staleTtlMs,
    negativeTtlMs = 30_000,
    backgroundConcurrency = Number.POSITIVE_INFINITY,
    now = Date.now,
    onBackgroundError
  }: StaleWhileRevalidateCacheOptions) {
    if (
      !Number.isFinite(freshTtlMs) ||
      !Number.isFinite(staleTtlMs) ||
      !Number.isFinite(negativeTtlMs) ||
      freshTtlMs <= 0 ||
      staleTtlMs <= freshTtlMs ||
      negativeTtlMs <= 0
    ) {
      throw new RangeError("cache TTLs must be positive and staleTtlMs must exceed freshTtlMs");
    }
    if (
      backgroundConcurrency !== Number.POSITIVE_INFINITY &&
      (!Number.isSafeInteger(backgroundConcurrency) || backgroundConcurrency <= 0)
    ) {
      throw new RangeError("backgroundConcurrency must be a positive integer");
    }

    this.#fresh = new TtlCache(now);
    this.#stale = new TtlCache(now);
    this.#retryBackoff = new TtlCache(now);
    this.#freshTtlMs = freshTtlMs;
    this.#staleTtlMs = staleTtlMs;
    this.#negativeTtlMs = negativeTtlMs;
    this.#backgroundConcurrency = backgroundConcurrency;
    this.#onBackgroundError = onBackgroundError;
  }

  get(key: string, load: () => Promise<T | null>): Promise<T | null> {
    const fresh = this.#fresh.get(key);
    if (fresh !== undefined) return Promise.resolve(fresh);

    const stale = this.#stale.get(key);
    if (stale === undefined) return this.#request(key, load);
    if (this.#retryBackoff.get(key)) return Promise.resolve(stale);

    this.#refreshInBackground(key, load);
    return Promise.resolve(stale);
  }

  clear() {
    this.#fresh.clear();
    this.#stale.clear();
    this.#retryBackoff.clear();
  }

  #refreshInBackground(key: string, load: () => Promise<T | null>) {
    if (this.#requests.has(key)) return;
    const request = this.#request(key, () => this.#withBackgroundSlot(load));
    void request.catch((error: unknown) => {
      try {
        this.#onBackgroundError?.(error, key);
      } catch {
        // Cache refresh failures must never become unhandled rejections.
      }
    });
  }

  #request(key: string, load: () => Promise<T | null>) {
    const inFlight = this.#requests.get(key);
    if (inFlight) return inFlight;

    const request = (async () => {
      try {
        const value = await load();
        if (value !== null) {
          this.#fresh.set(key, value, this.#freshTtlMs);
          this.#stale.set(key, value, this.#staleTtlMs);
          this.#retryBackoff.delete(key);
        } else if (this.#stale.get(key) !== undefined) {
          this.#retryBackoff.set(key, true, this.#negativeTtlMs);
        } else {
          this.#fresh.set(key, null, this.#negativeTtlMs);
        }
        return value;
      } catch (error) {
        if (this.#stale.get(key) !== undefined) {
          this.#retryBackoff.set(key, true, this.#negativeTtlMs);
        }
        throw error;
      }
    })();

    this.#requests.set(key, request);
    void request.then(
      () => this.#deleteRequest(key, request),
      () => this.#deleteRequest(key, request)
    );
    return request;
  }

  #deleteRequest(key: string, request: Promise<T | null>) {
    if (this.#requests.get(key) === request) this.#requests.delete(key);
  }

  async #withBackgroundSlot(load: () => Promise<T | null>) {
    await this.#acquireBackgroundSlot();
    try {
      return await load();
    } finally {
      this.#releaseBackgroundSlot();
    }
  }

  async #acquireBackgroundSlot() {
    if (this.#activeBackgroundRequests < this.#backgroundConcurrency) {
      this.#activeBackgroundRequests += 1;
      return;
    }
    await new Promise<void>((resolve) => this.#backgroundWaiters.push(resolve));
  }

  #releaseBackgroundSlot() {
    const next = this.#backgroundWaiters.shift();
    if (next) {
      next();
    } else {
      this.#activeBackgroundRequests -= 1;
    }
  }
}
