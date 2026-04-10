# CATE Protocol

**Consumer Agent Trust Envelope** — an open protocol SDK for agent-to-agent trust.

CATE wraps every agent message in a verifiable envelope carrying identity, consent, rate-limit budgets, and optional cost signals — so receiving agents can enforce policy before executing anything.

## Why CATE?

As AI agents begin communicating autonomously, there is no standard way for a receiving agent to answer:

- **Who is this?** Verifiable identity via DIDs and Verifiable Credentials.
- **Are they allowed?** Consent proofs and policy rules evaluated per-message.
- **How much can they do?** Trust-tier rate limiting with token-bucket enforcement.
- **Is this spam?** Proof-of-work and micropayment stamps raise the cost of abuse.
- **Is it private?** MLS-based end-to-end encryption for pairwise and group channels.

## Install

```bash
npm install @cate-protocol/sdk
```

## Quick Start

### Sending a message

```typescript
import { CATEClient } from "@cate-protocol/sdk";
import { MemoryKeystore, createDID } from "@cate-protocol/sdk/identity";
import { HttpTransport } from "@cate-protocol/sdk/transport";

const keystore = new MemoryKeystore();
const { did } = await createDID(keystore, "my-key");

const client = new CATEClient({
  identity: { did, keyId: "my-key", keystore },
});

await client.connect(new HttpTransport());
await client.send({
  to: "did:web:other-agent.example.com",
  endpoint: "https://other-agent.example.com/cate",
  intent: "personal",
  content: "Hello from my agent",
});
```

### Receiving messages

```typescript
import { CATEServer } from "@cate-protocol/sdk";
import { MemoryKeystore, createDID } from "@cate-protocol/sdk/identity";
import { HttpTransport } from "@cate-protocol/sdk/transport";

const keystore = new MemoryKeystore();
const { did } = await createDID(keystore, "server-key");

const server = new CATEServer({
  identity: { did, keystore },
  policy: {
    default_action: "deny",
    rules: [
      {
        name: "allow-verified",
        match: { trust_tier: ["verified", "trusted"] },
        action: "allow",
        priority: 10,
      },
      {
        name: "stamp-unknown",
        match: { trust_tier: ["unknown"] },
        action: "require_stamp",
        stamp_requirement: {
          required: true,
          accepted_types: ["pow"],
          pow: { difficulty: 16, algorithm: "sha256" },
        },
        priority: 5,
      },
    ],
  },
  onMessage: async (envelope, context) => {
    console.log(`From: ${context.senderDid}`);
    console.log(`Trust: ${context.trustTier}, Action: ${context.policyAction}`);
  },
});

await server.listen({ transport: new HttpTransport({ port: 8800 }) });
```

## Modules

The SDK is split into subpath exports so you can import only what you need.

| Import                          | Description                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@cate-protocol/sdk`            | `CATEClient`, `CATEServer`, envelope helpers                                                   |
| `@cate-protocol/sdk/types`      | Zod schemas and TypeScript types for envelopes, DIDs, policies                                 |
| `@cate-protocol/sdk/identity`   | DID creation/resolution (`did:key`, `did:web`), keystores, Verifiable Credentials, agent cards |
| `@cate-protocol/sdk/stamps`     | Proof-of-work and micropayment stamp creation and verification                                 |
| `@cate-protocol/sdk/policy`     | Policy engine, consent manager, intent classifier, rate limiter                                |
| `@cate-protocol/sdk/encryption` | MLS group management and key packages                                                          |
| `@cate-protocol/sdk/transport`  | Abstract transport + HTTP reference implementation                                             |
| `@cate-protocol/sdk/adapters`   | A2A task and MCP tool-call wrappers                                                            |

## Envelope Structure

Every CATE message is a `CATEEnvelope`:

```
┌─────────────────────────────────────────┐
│ header    — version, msg_id, timestamp  │
│ parties   — from/to DIDs + key IDs     │
│ security  — channel, signature          │
│ policy    — intent, consent, labels     │
│ rate_limit — budget for this sender     │
│ stamp?    — PoW hash or payment receipt │
│ payload?  — encrypted message content   │
└─────────────────────────────────────────┘
```

## Identity

CATE uses [W3C Decentralized Identifiers](https://www.w3.org/TR/did-core/) for agent identity:

- **`did:key`** — self-issued, derived from an Ed25519 public key. No network needed.
- **`did:web`** — resolved via `/.well-known/did.json` on the agent's domain.

Agents can issue **Verifiable Credentials** to prove delegation ("agent X acts for user Y") using Ed25519 signatures.

```typescript
import { issueActsForVC, verifyVC } from "@cate-protocol/sdk/identity";

const vc = await issueActsForVC(keystore, {
  issuerDid: userDid,
  issuerKeyId: "user-key",
  agentDid: agentDid,
  scope: ["read", "write"],
});

const result = await verifyVC(keystore, vc, issuerPublicKey);
```

## Stamps

Stamps attach a cost to sending messages, discouraging spam:

**Proof-of-Work** — the sender burns CPU cycles to produce a valid hash:

```typescript
import { createPoWStamp, verifyPoWStamp } from "@cate-protocol/sdk/stamps";

const stamp = createPoWStamp({ difficulty: 16 });
const result = verifyPoWStamp(stamp); // { valid: true, type: "pow" }
```

**Micropayment** — the sender attaches a payment receipt:

```typescript
import { createMicropaymentStamp, verifyMicropaymentStamp } from "@cate-protocol/sdk/stamps";

const stamp = createMicropaymentStamp({
  amount: 0.01,
  currency: "USD",
  payee_did: receiverDid,
  receipt_ref: "stripe_pi_xxx",
});
```

## Policy Engine

The policy engine evaluates each incoming message against a rule set:

```typescript
import { PolicyEngine } from "@cate-protocol/sdk/policy";

const engine = new PolicyEngine({
  default_action: "deny",
  rules: [
    {
      name: "block-promo",
      match: { intent: ["promotional"] },
      action: "deny",
      priority: 100,
    },
    {
      name: "allow-trusted",
      match: { trust_tier: ["trusted"] },
      action: "allow",
      priority: 50,
    },
  ],
});

const decision = engine.evaluate(envelope, "trusted");
```

Rules match on **intent** (`personal`, `transactional`, `promotional`, `system`), **trust tier** (`unknown`, `basic`, `verified`, `trusted`), **sender DID**, and **data labels** (`pii`, `finance`, `health`).

## Rate Limiting

Token-bucket rate limiting per sender, configurable by trust tier:

```typescript
import { RateLimiter } from "@cate-protocol/sdk/policy";

const limiter = new RateLimiter();
const budget = {
  max_messages_per_hour: 60,
  max_tokens_per_hour: 100_000,
  max_tool_calls_per_hour: 30,
};

if (limiter.allow(senderDid, budget)) {
  // process message
}
```

## Protocol Adapters

CATE envelopes can wrap payloads from other agent protocols:

**A2A (Agent-to-Agent):**

```typescript
import { wrapA2ATask, unwrapA2ATask } from "@cate-protocol/sdk/adapters";

const envelope = wrapA2ATask({
  task: a2aTask,
  from: { did: myDid, key_id: "key-1" },
  to: { did: otherDid, key_id: "key-1" },
});
```

**MCP (Model Context Protocol):**

```typescript
import { wrapMCPToolCall, unwrapMCPToolCall } from "@cate-protocol/sdk/adapters";

const envelope = wrapMCPToolCall({
  tool: { name: "search", arguments: { query: "test" } },
  from: { did: myDid, key_id: "key-1" },
  to: { did: otherDid, key_id: "key-1" },
  oauth_scopes: ["tools:execute"],
});
```

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm typecheck        # TypeScript check
pnpm test             # Run tests
pnpm lint             # Oxlint
pnpm format           # Oxfmt
pnpm check            # All checks (CI gate)
```

## License

Apache-2.0
