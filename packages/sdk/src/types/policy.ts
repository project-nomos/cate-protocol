/**
 * Policy types — intent classification, consent, rate limiting rules.
 */

import { z } from "zod";
import { StampRequirementSchema } from "./stamps.js";

export const IntentCategorySchema = z.enum(["personal", "transactional", "promotional", "system"]);

export type IntentCategory = z.infer<typeof IntentCategorySchema>;

export const TrustTierSchema = z.enum(["unknown", "basic", "verified", "trusted"]);
export type TrustTier = z.infer<typeof TrustTierSchema>;

export const RateBudgetSchema = z.object({
  max_messages_per_hour: z.number().int().positive().default(60),
  max_tokens_per_hour: z.number().int().positive().default(100_000),
  max_tool_calls_per_hour: z.number().int().positive().default(30),
});

export type RateBudget = z.infer<typeof RateBudgetSchema>;

export const PolicyRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  match: z.object({
    intent: z.array(IntentCategorySchema).optional(),
    trust_tier: z.array(TrustTierSchema).optional(),
    sender_did: z.array(z.string()).optional(),
    data_labels: z.array(z.string()).optional(),
  }),
  action: z.enum(["allow", "deny", "require_approval", "require_stamp"]),
  stamp_requirement: StampRequirementSchema.optional(),
  rate_budget: RateBudgetSchema.optional(),
  priority: z.number().int().default(0),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicyConfigSchema = z.object({
  default_action: z.enum(["allow", "deny"]).default("deny"),
  rules: z.array(PolicyRuleSchema).default([]),
  default_rate_budget: RateBudgetSchema.optional(),
  trust_tier_budgets: z.record(TrustTierSchema, RateBudgetSchema).optional(),
});

export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;

/** Result of policy evaluation */
export interface PolicyDecision {
  action: "allow" | "deny" | "require_approval" | "require_stamp";
  matched_rule?: string;
  reason?: string;
  stamp_requirement?: z.infer<typeof StampRequirementSchema>;
}
