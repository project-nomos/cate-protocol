/**
 * Proof-of-Work stamp — hash-based token with configurable difficulty.
 *
 * Cheap to verify, costly to generate. Used where payments are
 * not desired but spam prevention is needed.
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import type { PoWStamp } from "../types/envelope.js";
import type { StampVerificationResult } from "../types/stamps.js";

/**
 * Count leading zero bits in a hex hash string.
 */
function countLeadingZeroBits(hexHash: string): number {
  let bits = 0;
  for (const char of hexHash) {
    const nibble = parseInt(char, 16);
    if (nibble === 0) {
      bits += 4;
    } else {
      // Count leading zeros in this nibble
      if (nibble < 2) bits += 3;
      else if (nibble < 4) bits += 2;
      else if (nibble < 8) bits += 1;
      break;
    }
  }
  return bits;
}

/**
 * Compute the PoW hash for a given challenge and nonce.
 */
function computePoWHash(challenge: string, nonce: string): string {
  const input = new TextEncoder().encode(`${challenge}:${nonce}`);
  return bytesToHex(sha256(input));
}

export interface CreatePoWStampParams {
  difficulty: number;
  challenge?: string;
  maxIterations?: number;
}

/**
 * Create a proof-of-work stamp by mining a nonce that produces
 * a hash with the required number of leading zero bits.
 */
export function createPoWStamp(params: CreatePoWStampParams): PoWStamp {
  const { difficulty, maxIterations = 10_000_000 } = params;
  const challenge = params.challenge ?? crypto.randomUUID();

  for (let i = 0; i < maxIterations; i++) {
    const nonce = `${challenge}:${i}`;
    const hash = computePoWHash(challenge, nonce);
    const zeroBits = countLeadingZeroBits(hash);

    if (zeroBits >= difficulty) {
      return { difficulty, nonce, hash };
    }
  }

  throw new Error(
    `Failed to find PoW solution after ${maxIterations} iterations (difficulty=${difficulty})`,
  );
}

/**
 * Verify a proof-of-work stamp.
 *
 * Recomputes the hash and checks it has the required
 * number of leading zero bits.
 */
export function verifyPoWStamp(stamp: PoWStamp, minDifficulty?: number): StampVerificationResult {
  const requiredDifficulty = minDifficulty ?? stamp.difficulty;

  if (stamp.difficulty < requiredDifficulty) {
    return {
      valid: false,
      type: "pow",
      reason: `Difficulty ${stamp.difficulty} below minimum ${requiredDifficulty}`,
    };
  }

  // Extract challenge from nonce (format: "challenge:iteration")
  const parts = stamp.nonce.split(":");
  if (parts.length < 2) {
    return { valid: false, type: "pow", reason: "Invalid nonce format" };
  }
  const challenge = parts.slice(0, -1).join(":");

  const hash = computePoWHash(challenge, stamp.nonce);

  if (hash !== stamp.hash) {
    return { valid: false, type: "pow", reason: "Hash mismatch" };
  }

  const zeroBits = countLeadingZeroBits(hash);
  if (zeroBits < requiredDifficulty) {
    return {
      valid: false,
      type: "pow",
      reason: `Hash has ${zeroBits} leading zero bits, need ${requiredDifficulty}`,
    };
  }

  return { valid: true, type: "pow" };
}
