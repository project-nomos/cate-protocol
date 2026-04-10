/**
 * Intent classifier — categorizes messages by intent.
 *
 * Simple keyword/pattern-based classifier. Consumers can
 * replace with LLM-based classification.
 */

import type { IntentCategory } from "../types/policy.js";

const SYSTEM_PATTERNS = [/^system\b/i, /heartbeat/i, /ping/i, /health.?check/i, /status/i];

const TRANSACTIONAL_PATTERNS = [
  /\b(pay|payment|invoice|receipt|order|purchase|buy|sell|transfer)\b/i,
  /\b(confirm|verify|authenticate|authorize)\b/i,
  /\b(schedule|booking|reservation|appointment)\b/i,
];

const PROMOTIONAL_PATTERNS = [
  /\b(offer|deal|discount|promotion|sale|free|limited.time)\b/i,
  /\b(subscribe|newsletter|announcement|update)\b/i,
  /\b(brand|sponsor|advertis)\b/i,
];

/**
 * Classify message content into an intent category.
 *
 * Returns the most likely intent based on keyword patterns.
 * Default is "personal" for unmatched content.
 */
export function classifyIntent(content: string): IntentCategory {
  if (SYSTEM_PATTERNS.some((p) => p.test(content))) return "system";
  if (TRANSACTIONAL_PATTERNS.some((p) => p.test(content))) return "transactional";
  if (PROMOTIONAL_PATTERNS.some((p) => p.test(content))) return "promotional";
  return "personal";
}
