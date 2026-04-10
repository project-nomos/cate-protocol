# @cate-protocol/sdk

**Consumer Agent Trust Envelope** — a protocol SDK for agent-to-agent trust.

Provides verifiable identity (DIDs + VCs), end-to-end encryption (MLS), consent enforcement, rate limiting, and message stamps (proof-of-work + micropayments) for agent-to-agent communication.

## Install

```bash
npm install @cate-protocol/sdk
```

## Quick Start

```typescript
import { CATEClient, CATEServer } from "@cate-protocol/sdk";
import { MemoryKeystore, createDID } from "@cate-protocol/sdk/identity";
import { HttpTransport } from "@cate-protocol/sdk/transport";

// Create identity
const keystore = new MemoryKeystore();
const { did } = await createDID(keystore, "my-key");

// Send a message
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

// Receive messages
const server = new CATEServer({
  identity: { did, keystore },
  policy: { default_action: "allow", rules: [] },
  onMessage: async (envelope, context) => {
    console.log(`From: ${context.senderDid}, Trust: ${context.trustTier}`);
  },
});
await server.listen({ transport: new HttpTransport({ port: 8800 }) });
```

## Modules

| Import | Description |
| --- | --- |
| `@cate-protocol/sdk` | CATEClient, CATEServer, envelope helpers |
| `@cate-protocol/sdk/types` | Zod schemas and TypeScript types |
| `@cate-protocol/sdk/identity` | DIDs, keystores, Verifiable Credentials, agent cards |
| `@cate-protocol/sdk/stamps` | Proof-of-work and micropayment stamps |
| `@cate-protocol/sdk/policy` | Policy engine, consent, intent classifier, rate limiter |
| `@cate-protocol/sdk/encryption` | MLS group management and key packages |
| `@cate-protocol/sdk/transport` | Abstract transport + HTTP implementation |
| `@cate-protocol/sdk/adapters` | A2A and MCP protocol wrappers |

## Documentation

See the full [README](https://github.com/project-nomos/cate-protocol#readme) for detailed usage, examples, and API reference.

## License

Apache-2.0
