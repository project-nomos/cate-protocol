/**
 * Unified stamp verification — handles both micropayment and PoW stamps.
 */

import type { Stamp } from "../types/envelope.js";
import type { StampRequirement, StampVerificationResult } from "../types/stamps.js";
import { verifyMicropaymentStamp } from "./micropayment.js";
import { verifyPoWStamp } from "./pow.js";

/**
 * Verify a stamp against a requirement.
 *
 * Returns a verification result indicating whether the stamp
 * satisfies the given requirement.
 */
export function verifyStamp(
  stamp: Stamp | undefined,
  requirement: StampRequirement,
): StampVerificationResult {
  // No stamp required → always valid
  if (!requirement.required) {
    return { valid: true, type: stamp?.type ?? "none" };
  }

  // Stamp required but none provided
  if (!stamp || stamp.type === "none") {
    return {
      valid: false,
      type: "none",
      reason: "Stamp required but none provided",
    };
  }

  // Check if stamp type is accepted
  if (!requirement.accepted_types.includes(stamp.type)) {
    return {
      valid: false,
      type: stamp.type,
      reason: `Stamp type '${stamp.type}' not accepted (allowed: ${requirement.accepted_types.join(", ")})`,
    };
  }

  if (stamp.type === "micropayment" && stamp.micropayment) {
    if (!requirement.micropayment) {
      return {
        valid: false,
        type: "micropayment",
        reason: "Micropayment stamp provided but no micropayment config specified",
      };
    }
    return verifyMicropaymentStamp(
      stamp.micropayment,
      requirement.micropayment.payee_did,
      requirement.micropayment.min_amount,
    );
  }

  if (stamp.type === "pow" && stamp.pow) {
    return verifyPoWStamp(stamp.pow, requirement.pow?.difficulty);
  }

  return {
    valid: false,
    type: stamp.type,
    reason: `Stamp type '${stamp.type}' declared but data missing`,
  };
}
