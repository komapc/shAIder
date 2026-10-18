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

/** First address of X-Forwarded-For (AppSync puts the client there), else "unknown". */
export function clientIp(event: { request?: { headers?: Record<string, string | undefined> } }): string {
  const xff = event.request?.headers?.["x-forwarded-for"];
  return xff?.split(",")[0]?.trim() || "unknown";
}
