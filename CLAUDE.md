# CLAUDE.md

## Project Overview

Consumer Agent Trust Envelope (CATE) — a standalone protocol SDK for agent-to-agent trust. Provides verifiable identity (DIDs + VCs), E2EE (MLS), consent enforcement, rate limiting, and message stamps (micropayment + PoW).

## Build & Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm typecheck        # TypeScript check
pnpm test             # Run tests
pnpm lint             # Oxlint
pnpm format           # Oxfmt
pnpm check            # All checks (CI gate)
```

## Architecture

Monorepo with `@cate-protocol/sdk` as the core package. Subpath exports:

- `@cate-protocol/sdk` — main client/server
- `@cate-protocol/sdk/types` — Zod schemas + TypeScript types
- `@cate-protocol/sdk/identity` — DID resolver, VCs, agent cards, keystore
- `@cate-protocol/sdk/stamps` — micropayment + PoW stamps
- `@cate-protocol/sdk/policy` — policy engine, intent classifier, rate limiter
- `@cate-protocol/sdk/encryption` — MLS group management
- `@cate-protocol/sdk/transport` — abstract + HTTP transport
- `@cate-protocol/sdk/adapters` — A2A + MCP bridges

## Conventions

- Strict TypeScript, ESM-only
- Zod for all schema validation
- `@noble/hashes` and `@noble/ed25519` for crypto (no native deps)
- Tests colocated as `*.test.ts`
- Keep files under ~500 LOC
