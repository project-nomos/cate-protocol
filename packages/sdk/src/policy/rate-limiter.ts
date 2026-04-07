/**
 * Token bucket rate limiter — per-DID quotas.
 *
 * Enforces rate limits based on trust tier and intent category.
 * Uses a standard token bucket algorithm with configurable
 * refill rates.
 */

import type { RateBudget } from "../types/policy.js";

interface Bucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per millisecond
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  /**
   * Check if a request is allowed under the rate limit.
   * Returns true if allowed, false if rate limited.
   */
  allow(senderId: string, budget: RateBudget, cost = 1): boolean {
    const bucket = this.getOrCreateBucket(
      senderId,
      budget.max_messages_per_hour,
    );

    this.refill(bucket);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }

    return false;
  }

  /**
   * Check remaining tokens for a sender.
   */
  remaining(senderId: string): number {
    const bucket = this.buckets.get(senderId);
    if (!bucket) return -1;
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }

  /**
   * Reset rate limit for a sender.
   */
  reset(senderId: string): void {
    this.buckets.delete(senderId);
  }

  /**
   * Reset all rate limits.
   */
  resetAll(): void {
    this.buckets.clear();
  }

  private getOrCreateBucket(senderId: string, maxPerHour: number): Bucket {
    let bucket = this.buckets.get(senderId);
    if (!bucket) {
      bucket = {
        tokens: maxPerHour,
        lastRefill: Date.now(),
        maxTokens: maxPerHour,
        refillRate: maxPerHour / (60 * 60 * 1000), // per ms
      };
      this.buckets.set(senderId, bucket);
    }
    return bucket;
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * bucket.refillRate;

    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
}
