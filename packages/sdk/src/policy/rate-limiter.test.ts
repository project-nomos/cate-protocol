import { describe, it, expect } from "vitest";
import { RateLimiter } from "./rate-limiter.js";
import type { RateBudget } from "../types/policy.js";

const budget: RateBudget = {
  max_messages_per_hour: 10,
  max_tokens_per_hour: 100_000,
  max_tool_calls_per_hour: 30,
};

describe("RateLimiter", () => {
  it("allows requests within budget", () => {
    const limiter = new RateLimiter();

    for (let i = 0; i < 10; i++) {
      expect(limiter.allow("did:key:sender1", budget)).toBe(true);
    }
  });

  it("denies requests exceeding budget", () => {
    const limiter = new RateLimiter();

    // Exhaust the bucket
    for (let i = 0; i < 10; i++) {
      limiter.allow("did:key:sender1", budget);
    }

    expect(limiter.allow("did:key:sender1", budget)).toBe(false);
  });

  it("tracks separate buckets per sender", () => {
    const limiter = new RateLimiter();

    for (let i = 0; i < 10; i++) {
      limiter.allow("did:key:sender1", budget);
    }

    // Different sender should still have budget
    expect(limiter.allow("did:key:sender2", budget)).toBe(true);
  });

  it("reports remaining tokens", () => {
    const limiter = new RateLimiter();

    limiter.allow("did:key:sender1", budget);
    expect(limiter.remaining("did:key:sender1")).toBe(9);
  });

  it("resets a specific sender", () => {
    const limiter = new RateLimiter();

    for (let i = 0; i < 10; i++) {
      limiter.allow("did:key:sender1", budget);
    }

    limiter.reset("did:key:sender1");
    expect(limiter.allow("did:key:sender1", budget)).toBe(true);
  });
});
