import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight in-memory, fixed-window rate limiter. Good enough defense
 * against casual abuse/spam on a single-instance pilot deployment. It does
 * NOT share state across multiple server instances (e.g. serverless
 * functions scaled horizontally) — swap for a shared store (e.g. Upstash
 * Redis) before running this behind more than one instance.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Convenience wrapper for route handlers: returns a 429 NextResponse if the
 * request should be blocked, or null if it's allowed to proceed.
 */
export function rateLimitResponse(
  request: NextRequest,
  routeName: string,
  options: { limit: number; windowMs: number }
): NextResponse | null {
  const key = `${routeName}:${getClientIp(request)}`;
  const result = checkRateLimit(key, options);

  if (result.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}
