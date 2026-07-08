import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cronAuthorized } from "./cron-auth";

function withCronEnv(
  env: {
    CRON_SECRET?: string;
  },
  callback: () => void
) {
  const previousCronSecret = process.env.CRON_SECRET;

  setOptionalEnv("CRON_SECRET", env.CRON_SECRET);

  try {
    callback();
  } finally {
    setOptionalEnv("CRON_SECRET", previousCronSecret);
  }
}

function setOptionalEnv(name: "CRON_SECRET", value?: string) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe("cronAuthorized", () => {
  it("accepts the Vercel CRON_SECRET bearer token", () => {
    withCronEnv({ CRON_SECRET: "cron-secret" }, () => {
      const request = new Request("https://example.com/api/cron/portfolio/refresh", {
        headers: { authorization: "Bearer cron-secret" }
      });

      assert.equal(cronAuthorized(request), true);
    });
  });

  it("rejects query string secrets", () => {
    withCronEnv({ CRON_SECRET: "cron-secret" }, () => {
      const request = new Request("https://example.com/api/cron/portfolio/refresh?secret=cron-secret");

      assert.equal(cronAuthorized(request), false);
    });
  });

  it("rejects requests when no cron secret is configured", () => {
    withCronEnv({}, () => {
      const request = new Request("https://example.com/api/cron/portfolio/refresh", {
        headers: { authorization: "Bearer cron-secret" }
      });

      assert.equal(cronAuthorized(request), false);
    });
  });
});
