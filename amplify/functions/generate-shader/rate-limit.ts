import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";

export interface RateLimits {
  perIpPerHour: number;
  perDay: number;
}

export const DEFAULT_LIMITS: RateLimits = { perIpPerHour: 60, perDay: 3000 };

export class RateLimitError extends Error {
  constructor() {
    super("Rate limit exceeded. Please try again later.");
  }
}

interface Db {
  send(command: UpdateItemCommand): Promise<unknown>;
}

// Atomically increments a counter and rejects once it has reached `max`.
async function hit(db: Db, table: string, key: string, max: number, expiresAt: number) {
  try {
    await db.send(
      new UpdateItemCommand({
        TableName: table,
        Key: { pk: { S: key } },
        UpdateExpression: "ADD hits :one SET expiresAt = :exp",
        ConditionExpression: "attribute_not_exists(hits) OR hits < :max",
        ExpressionAttributeValues: {
          ":one": { N: "1" },
          ":max": { N: String(max) },
          ":exp": { N: String(expiresAt) },
        },
      })
    );
  } catch (err) {
    if (err instanceof Error && err.name === "ConditionalCheckFailedException") throw new RateLimitError();
    throw err;
  }
}

/** Counts one request against the global daily cap and the caller's hourly cap. */
export async function enforceRateLimit(
  db: Db,
  table: string,
  ip: string,
  limits: RateLimits = DEFAULT_LIMITS,
  nowMs: number = Date.now()
) {
  const sec = Math.floor(nowMs / 1000);
  const day = Math.floor(sec / 86400);
  const hour = Math.floor(sec / 3600);
  // Per-IP first, so a blocked caller cannot burn the shared daily budget
  await hit(db, table, `ip#${ip}#${hour}`, limits.perIpPerHour, (hour + 2) * 3600);
  await hit(db, table, `global#${day}`, limits.perDay, (day + 2) * 86400);
}

/**
 * Client address from X-Forwarded-For. AppSync's CloudFront front door appends
 * "<client>, <edge>" to whatever the caller sent, so everything left of the last
 * two entries is caller-controlled. Measured 2026-11-16 (security audit):
 *   no XFF sent        -> "<client>,<edge>"
 *   "1.2.3.4" sent     -> "1.2.3.4,<client>,<edge>"
 * So the real client is the second entry from the right.
 */
export function clientIp(event: { request?: { headers?: Record<string, string | undefined> } }): string {
  const parts = (event.request?.headers?.["x-forwarded-for"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || "unknown";
}
