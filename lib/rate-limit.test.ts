import { describe, expect, it, beforeEach, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
  });

  it("blocks the request once the limit is exceeded", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { limit: 5, windowMs: 60_000 });
    }
    const result = checkRateLimit(key, { limit: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(keyA, { limit: 3, windowMs: 60_000 });

    expect(checkRateLimit(keyA, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
    expect(checkRateLimit(keyB, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("resets the count after the window elapses", () => {
    vi.useFakeTimers();
    const key = `reset-${Math.random()}`;

    for (let i = 0; i < 2; i++) checkRateLimit(key, { limit: 2, windowMs: 1000 });
    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }).allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }).allowed).toBe(true);
    vi.useRealTimers();
  });
});
