import { describe, it, expect } from "vitest";
import { enforceRateLimit, clientIp, RateLimitError } from "./rate-limit";

// Minimal in-memory stand-in for DynamoDB's conditional counter.
function fakeDb() {
  const counts = new Map<string, number>();
  return {
    counts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(cmd: any) {
      const { Key, ExpressionAttributeValues: v } = cmd.input;
      const key = Key.pk.S as string;
      const n = counts.get(key) ?? 0;
      if (n >= Number(v[":max"].N)) {
        const e = new Error("conditional");
        e.name = "ConditionalCheckFailedException";
        throw e;
      }
      counts.set(key, n + 1);
    },
  };
}

describe("enforceRateLimit", () => {
  const limits = { perIpPerHour: 2, perDay: 3 };
  const t0 = Date.UTC(2026, 9, 18, 12, 0, 0);

  it("blocks an IP after its hourly limit and lets others through", async () => {
    const db = fakeDb();
    await enforceRateLimit(db, "t", "1.1.1.1", limits, t0);
    await enforceRateLimit(db, "t", "1.1.1.1", limits, t0);
    await expect(enforceRateLimit(db, "t", "1.1.1.1", limits, t0)).rejects.toBeInstanceOf(RateLimitError);
    await enforceRateLimit(db, "t", "2.2.2.2", limits, t0);
  });

  it("resets the per-IP counter in the next hour", async () => {
    const db = fakeDb();
    await enforceRateLimit(db, "t", "1.1.1.1", limits, t0);
    await enforceRateLimit(db, "t", "1.1.1.1", limits, t0);
    await enforceRateLimit(db, "t", "1.1.1.1", limits, t0 + 3600_000);
  });

  it("enforces the global daily cap across IPs", async () => {
    const db = fakeDb();
    for (const ip of ["a", "b", "c"]) await enforceRateLimit(db, "t", ip, limits, t0);
    await expect(enforceRateLimit(db, "t", "d", limits, t0)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("rethrows unexpected database errors", async () => {
    const db = { send: async () => { throw new Error("boom"); } };
    await expect(enforceRateLimit(db, "t", "x", limits, t0)).rejects.toThrow("boom");
  });
});

describe("clientIp", () => {
  it("takes the first X-Forwarded-For entry", () => {
    expect(clientIp({ request: { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } } })).toBe("9.9.9.9");
  });
  it("falls back to unknown", () => {
    expect(clientIp({})).toBe("unknown");
  });
});
