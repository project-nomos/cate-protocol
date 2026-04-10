/**
 * CATE_Envelope — the core message envelope schema.
 *
 * Transport-agnostic envelope for agent-to-agent communication with
 * verifiable identity, E2EE, consent semantics, rate limits, and stamps.
 */

import { z } from "zod";

// --- Header ---

export const EnvelopeHeaderSchema = z.object({
  version: z.string().default("1.0"),
  msg_id: z.string().uuid(),
  thread_id: z.string(),
  timestamp: z.string().datetime(),
  ttl_seconds: z.number().int().positive().default(86400),
});

export type EnvelopeHeader = z.infer<typeof EnvelopeHeaderSchema>;

// --- Parties ---

export const PartySchema = z.object({
  did: z.string().startsWith("did:"),
  key_id: z.string(),
  device_id: z.string().optional(),
});

export const PartiesSchema = z.object({
  from: PartySchema,
  to: PartySchema.extend({
    endpoint_hint: z.string().url().optional(),
  }),
});

export type Party = z.infer<typeof PartySchema>;
export type Parties = z.infer<typeof PartiesSchema>;

// --- Discovery Proof ---

export const DiscoveryProofSchema = z.object({
  agent_card_url: z.string().url(),
  agent_card_sig: z.string(),
  vc_chain: z.array(z.string()).default([]),
  revocation_refs: z.array(z.string()).default([]),
});

export type DiscoveryProof = z.infer<typeof DiscoveryProofSchema>;

// --- Security ---

export const SecuritySchema = z.object({
  channel: z.enum(["mls", "none"]).default("none"),
  mls_group_id: z.string().optional(),
  mls_epoch: z.number().int().optional(),
  cipher_suite: z.string().optional(),
  payload_enc: z.string().optional(),
  envelope_sig: z.string(),
});

export type Security = z.infer<typeof SecuritySchema>;

// --- Policy ---

export const IntentSchema = z.enum(["personal", "transactional", "promotional", "system"]);

export const ActionClassSchema = z.enum(["inform", "request", "execute", "handoff"]);

export const DataLabelSchema = z.enum(["pii", "finance", "health", "none"]);

export const ConsentSchema = z.object({
  oauth_audience: z.string().optional(),
  oauth_scopes: z.array(z.string()).default([]),
  proof: z.string().optional(),
});

export const HumanApprovalSchema = z.object({
  required: z.boolean().default(false),
  reason: z.string().optional(),
});

export const PolicySchema = z.object({
  intent: IntentSchema,
  action_class: ActionClassSchema.default("inform"),
  data_labels: z.array(DataLabelSchema).default(["none"]),
  consent: ConsentSchema.optional(),
  human_approval: HumanApprovalSchema.optional(),
});

export type Intent = z.infer<typeof IntentSchema>;
export type ActionClass = z.infer<typeof ActionClassSchema>;
export type DataLabel = z.infer<typeof DataLabelSchema>;
export type Consent = z.infer<typeof ConsentSchema>;
export type HumanApproval = z.infer<typeof HumanApprovalSchema>;
export type Policy = z.infer<typeof PolicySchema>;

// --- Rate Limit ---

export const RateLimitSchema = z.object({
  sender_budget_class: z.enum(["base", "burst", "paid"]).default("base"),
  estimated_cost: z
    .object({
      tokens: z.number().int().nonnegative().default(0),
      tools: z.number().int().nonnegative().default(0),
    })
    .optional(),
});

export type RateLimit = z.infer<typeof RateLimitSchema>;

// --- Stamp ---

export const MicropaymentStampSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  payee_did: z.string().startsWith("did:"),
  receipt_ref: z.string(),
  expiry: z.string().datetime(),
});

export const PoWStampSchema = z.object({
  difficulty: z.number().int().min(1).max(64),
  nonce: z.string(),
  hash: z.string(),
});

export const StampSchema = z.object({
  type: z.enum(["none", "micropayment", "pow"]).default("none"),
  micropayment: MicropaymentStampSchema.optional(),
  pow: PoWStampSchema.optional(),
});

export type MicropaymentStamp = z.infer<typeof MicropaymentStampSchema>;
export type PoWStamp = z.infer<typeof PoWStampSchema>;
export type Stamp = z.infer<typeof StampSchema>;

// --- Audit ---

export const AuditSchema = z.object({
  trace_id: z.string().uuid(),
  log_level: z.enum(["minimal", "standard", "forensics"]).default("standard"),
  retention_days: z.number().int().positive().default(30),
});

export type Audit = z.infer<typeof AuditSchema>;

// --- Full Envelope ---

export const CATEEnvelopeSchema = z.object({
  header: EnvelopeHeaderSchema,
  parties: PartiesSchema,
  discovery_proof: DiscoveryProofSchema.optional(),
  security: SecuritySchema,
  policy: PolicySchema,
  rate_limit: RateLimitSchema.optional(),
  stamp: StampSchema.optional(),
  audit: AuditSchema.optional(),
  payload: z.string().optional(),
});

export type CATEEnvelope = z.infer<typeof CATEEnvelopeSchema>;

/**
 * Create a minimal CATE envelope with required fields.
 */
export function createEnvelope(params: {
  from: Party;
  to: Party & { endpoint_hint?: string };
  intent: Intent;
  payload?: string;
  thread_id?: string;
}): CATEEnvelope {
  return {
    header: {
      version: "1.0",
      msg_id: crypto.randomUUID(),
      thread_id: params.thread_id ?? crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ttl_seconds: 86400,
    },
    parties: {
      from: params.from,
      to: params.to,
    },
    security: {
      channel: "none",
      envelope_sig: "",
    },
    policy: {
      intent: params.intent,
      action_class: "inform",
      data_labels: ["none"],
    },
    payload: params.payload,
  };
}
