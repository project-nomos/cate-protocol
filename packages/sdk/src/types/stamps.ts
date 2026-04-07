/**
 * Stamp types — micropayment receipts and proof-of-work tokens.
 *
 * Stamps are used as "inbox postage" to price attention and prevent
 * agent-scale spam. Two types:
 * - Micropayment: verifiable receipt for monetary postage
 * - PoW: hash-based proof of computational work
 */

import { z } from "zod";

export const StampTypeSchema = z.enum(["none", "micropayment", "pow"]);
export type StampType = z.infer<typeof StampTypeSchema>;

export const MicropaymentConfigSchema = z.object({
  min_amount: z.number().positive().default(0.01),
  currency: z.string().default("USD"),
  payee_did: z.string().startsWith("did:"),
});

export type MicropaymentConfig = z.infer<typeof MicropaymentConfigSchema>;

export const PoWConfigSchema = z.object({
  difficulty: z.number().int().min(1).max(64).default(20),
  algorithm: z.enum(["sha256"]).default("sha256"),
});

export type PoWConfig = z.infer<typeof PoWConfigSchema>;

export const StampRequirementSchema = z.object({
  required: z.boolean().default(false),
  accepted_types: z.array(StampTypeSchema).default(["micropayment", "pow"]),
  micropayment: MicropaymentConfigSchema.optional(),
  pow: PoWConfigSchema.optional(),
});

export type StampRequirement = z.infer<typeof StampRequirementSchema>;

/** Result of stamp verification */
export interface StampVerificationResult {
  valid: boolean;
  type: StampType;
  reason?: string;
}
