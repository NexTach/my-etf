type CacheEntry<T> = { expiresAt: number; value: T };

export class TtlCache<T> {
  readonly #entries = new Map<string, CacheEntry<T>>();

  get(key: string) {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number) {
    this.#entries.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  }

  clear() {
    this.#entries.clear();
  }
}
