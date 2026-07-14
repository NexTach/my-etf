import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StaleWhileRevalidateCache } from "../src/infrastructure/stale-while-revalidate-cache.js";

type Chart = { close: number };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function cacheAt(clock: { now: number }, onBackgroundError?: (error: unknown, key: string) => void) {
  return new StaleWhileRevalidateCache<Chart>({
    freshTtlMs: 5 * 60_000,
    staleTtlMs: 6 * 60 * 60_000,
    negativeTtlMs: 30_000,
    backgroundConcurrency: 3,
    now: () => clock.now,
    onBackgroundError
  });
}

async function settleBackgroundWork() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe("StaleWhileRevalidateCache", () => {
  describe("given a cold key", () => {
    describe("when concurrent callers request it", () => {
      it("then awaits and coalesces a single load", async () => {
        const clock = { now: 0 };
        const cache = cacheAt(clock);
        const pending = deferred<Chart | null>();
        let loads = 0;
        const load = () => {
          loads += 1;
          return pending.promise;
        };

        const first = cache.get("SCHD:1y", load);
        const second = cache.get("SCHD:1y", load);
        assert.equal(loads, 1);

        pending.resolve({ close: 28 });
        assert.deepEqual(await Promise.all([first, second]), [{ close: 28 }, { close: 28 }]);
      });
    });
  });

  describe("given a successful value whose fresh TTL expired", () => {
    describe("when concurrent callers request it", () => {
      it("then returns stale immediately and starts exactly one background refresh", async () => {
        const clock = { now: 0 };
        const cache = cacheAt(clock);
        await cache.get("SCHD:1y", async () => ({ close: 28 }));
        clock.now = 5 * 60_000 + 1;

        const pending = deferred<Chart | null>();
        let refreshes = 0;
        const refresh = () => {
          refreshes += 1;
          return pending.promise;
        };

        assert.deepEqual(await Promise.all([
          cache.get("SCHD:1y", refresh),
          cache.get("SCHD:1y", refresh)
        ]), [{ close: 28 }, { close: 28 }]);
        assert.equal(refreshes, 1);

        pending.resolve({ close: 29 });
        await settleBackgroundWork();
        assert.deepEqual(await cache.get("SCHD:1y", refresh), { close: 29 });
        assert.equal(refreshes, 1);
      });
    });

    describe("when the background refresh returns no chart", () => {
      it("then keeps serving stale without retrying until the backoff expires", async () => {
        const clock = { now: 0 };
        const cache = cacheAt(clock);
        await cache.get("SCHD:1y", async () => ({ close: 28 }));
        clock.now = 5 * 60_000 + 1;
        let refreshes = 0;

        assert.deepEqual(await cache.get("SCHD:1y", async () => {
          refreshes += 1;
          return null;
        }), { close: 28 });
        await settleBackgroundWork();
        assert.deepEqual(await Promise.all([
          cache.get("SCHD:1y", async () => { refreshes += 1; return null; }),
          cache.get("SCHD:1y", async () => { refreshes += 1; return null; })
        ]), [{ close: 28 }, { close: 28 }]);
        assert.equal(refreshes, 1);

        clock.now += 30_001;
        const pending = deferred<Chart | null>();
        assert.deepEqual(await cache.get("SCHD:1y", () => {
          refreshes += 1;
          return pending.promise;
        }), { close: 28 });
        assert.equal(refreshes, 2);
        pending.resolve({ close: 29 });
        await settleBackgroundWork();
      });
    });

    describe("when the background refresh rejects", () => {
      it("then reports the error without losing the stale value", async () => {
        const clock = { now: 0 };
        const errors: Array<{ error: unknown; key: string }> = [];
        const cache = cacheAt(clock, (error, key) => errors.push({ error, key }));
        await cache.get("SCHD:1y", async () => ({ close: 28 }));
        clock.now = 5 * 60_000 + 1;
        const failure = new Error("upstream unavailable");

        assert.deepEqual(await cache.get("SCHD:1y", async () => { throw failure; }), { close: 28 });
        await settleBackgroundWork();

        assert.deepEqual(errors, [{ error: failure, key: "SCHD:1y" }]);
        let refreshes = 0;
        assert.deepEqual(await Promise.all([
          cache.get("SCHD:1y", async () => { refreshes += 1; return null; }),
          cache.get("SCHD:1y", async () => { refreshes += 1; return null; })
        ]), [{ close: 28 }, { close: 28 }]);
        assert.equal(refreshes, 0);

        clock.now += 30_001;
        const pending = deferred<Chart | null>();
        assert.deepEqual(await cache.get("SCHD:1y", () => {
          refreshes += 1;
          return pending.promise;
        }), { close: 28 });
        assert.equal(refreshes, 1);
        pending.resolve({ close: 29 });
        await settleBackgroundWork();
      });
    });

    describe("when many stale keys refresh together", () => {
      it("then caps background load concurrency", async () => {
        const clock = { now: 0 };
        const cache = new StaleWhileRevalidateCache<Chart>({
          freshTtlMs: 5 * 60_000,
          staleTtlMs: 6 * 60 * 60_000,
          backgroundConcurrency: 2,
          now: () => clock.now
        });
        await Promise.all(["A", "B", "C"].map((key) => cache.get(key, async () => ({ close: 28 }))));
        clock.now = 5 * 60_000 + 1;

        const pending = new Map(["A", "B", "C"].map((key) => [key, deferred<Chart | null>()]));
        let active = 0;
        let maximumActive = 0;
        const refresh = (key: string) => async () => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          try {
            return await pending.get(key)!.promise;
          } finally {
            active -= 1;
          }
        };

        assert.deepEqual(await Promise.all(["A", "B", "C"].map((key) => cache.get(key, refresh(key)))), [
          { close: 28 },
          { close: 28 },
          { close: 28 }
        ]);
        await settleBackgroundWork();
        assert.equal(active, 2);
        assert.equal(maximumActive, 2);

        pending.get("A")!.resolve({ close: 29 });
        await settleBackgroundWork();
        assert.equal(active, 2);
        assert.equal(maximumActive, 2);

        pending.get("B")!.resolve({ close: 29 });
        pending.get("C")!.resolve({ close: 29 });
        await settleBackgroundWork();
        assert.equal(active, 0);
      });
    });
  });

  describe("given a cold load that finds no chart", () => {
    describe("when the key is requested again within the negative TTL", () => {
      it("then reuses the negative result", async () => {
        const clock = { now: 0 };
        const cache = cacheAt(clock);
        let loads = 0;
        const load = async () => {
          loads += 1;
          return null;
        };

        assert.equal(await cache.get("UNKNOWN:1y", load), null);
        assert.equal(await cache.get("UNKNOWN:1y", load), null);
        assert.equal(loads, 1);
      });
    });
  });
});
