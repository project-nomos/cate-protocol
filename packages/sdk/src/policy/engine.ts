/**
 * Policy engine — evaluates CATE envelopes against configured rules.
 *
 * Rules are matched by priority (highest first). First matching rule wins.
 * If no rule matches, the default action is applied.
 */

import type { CATEEnvelope } from "../types/envelope.js";
import type { PolicyConfig, PolicyRule, PolicyDecision, TrustTier } from "../types/policy.js";
import { verifyStamp } from "../stamps/verifier.js";

export class PolicyEngine {
  private rules: PolicyRule[];
  private config: PolicyConfig;

  constructor(config: PolicyConfig) {
    this.config = config;
    // Sort rules by priority descending
    this.rules = [...config.rules].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate an envelope against the policy rules.
   */
  evaluate(
    envelope: CATEEnvelope,
    senderTrustTier: TrustTier = "unknown",
  ): PolicyDecision {
    for (const rule of this.rules) {
      if (this.matchesRule(rule, envelope, senderTrustTier)) {
        // If rule requires stamp, verify it
        if (rule.action === "require_stamp" && rule.stamp_requirement) {
          const stampResult = verifyStamp(envelope.stamp, rule.stamp_requirement);
          if (!stampResult.valid) {
            return {
              action: "deny",
              matched_rule: rule.name,
              reason: `Stamp required: ${stampResult.reason}`,
              stamp_requirement: rule.stamp_requirement,
            };
          }
        }

        return {
          action: rule.action === "require_stamp" ? "allow" : rule.action,
          matched_rule: rule.name,
          stamp_requirement: rule.stamp_requirement,
        };
      }
    }

    return {
      action: this.config.default_action,
      reason: "No matching rule",
    };
  }

  /**
   * Get the rate budget for a given trust tier.
   */
  getRateBudget(trustTier: TrustTier) {
    return (
      this.config.trust_tier_budgets?.[trustTier] ??
      this.config.default_rate_budget ?? {
        max_messages_per_hour: 60,
        max_tokens_per_hour: 100_000,
        max_tool_calls_per_hour: 30,
      }
    );
  }

  private matchesRule(
    rule: PolicyRule,
    envelope: CATEEnvelope,
    senderTrustTier: TrustTier,
  ): boolean {
    const { match } = rule;

    if (match.intent && !match.intent.includes(envelope.policy.intent)) {
      return false;
    }

    if (match.trust_tier && !match.trust_tier.includes(senderTrustTier)) {
      return false;
    }

    if (match.sender_did && !match.sender_did.includes(envelope.parties.from.did)) {
      return false;
    }

    if (match.data_labels) {
      const envelopeLabels = envelope.policy.data_labels;
      const hasMatch = match.data_labels.some((label) =>
        envelopeLabels.includes(label as "pii" | "finance" | "health" | "none"),
      );
      if (!hasMatch) return false;
    }

    return true;
  }
}
