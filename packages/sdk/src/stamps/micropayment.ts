/**
 * Micropayment stamp — verifiable receipt for monetary postage.
 *
 * Used as "inbox postage" to price attention for promotional
 * or transactional agent messages.
 */

import type { MicropaymentStamp } from "../types/envelope.js";
import type { StampVerificationResult } from "../types/stamps.js";

export interface CreateMicropaymentParams {
  amount: number;
  currency?: string;
  payee_did: string;
  receipt_ref: string;
  ttl_seconds?: number;
}

/**
 * Create a micropayment stamp with a receipt reference.
 */
export function createMicropaymentStamp(
  params: CreateMicropaymentParams,
): MicropaymentStamp {
  const ttl = params.ttl_seconds ?? 86400;
  const expiry = new Date(Date.now() + ttl * 1000).toISOString();

  return {
    amount: params.amount,
    currency: params.currency ?? "USD",
    payee_did: params.payee_did,
    receipt_ref: params.receipt_ref,
    expiry,
  };
}

/**
 * Verify a micropayment stamp.
 *
 * Checks:
 * - Amount is positive
 * - Payee DID matches expected
 * - Not expired
 * - Receipt reference is present
 *
 * Note: Actual payment verification against a payment rail
 * is the consumer's responsibility.
 */
export function verifyMicropaymentStamp(
  stamp: MicropaymentStamp,
  expectedPayeeDid: string,
  minAmount?: number,
): StampVerificationResult {
  if (stamp.amount <= 0) {
    return { valid: false, type: "micropayment", reason: "Amount must be positive" };
  }

  if (minAmount && stamp.amount < minAmount) {
    return {
      valid: false,
      type: "micropayment",
      reason: `Amount ${stamp.amount} below minimum ${minAmount}`,
    };
  }

  if (stamp.payee_did !== expectedPayeeDid) {
    return {
      valid: false,
      type: "micropayment",
      reason: "Payee DID mismatch",
    };
  }

  const expiry = new Date(stamp.expiry);
  if (expiry.getTime() < Date.now()) {
    return { valid: false, type: "micropayment", reason: "Stamp expired" };
  }

  if (!stamp.receipt_ref) {
    return {
      valid: false,
      type: "micropayment",
      reason: "Missing receipt reference",
    };
  }

  return { valid: true, type: "micropayment" };
}
