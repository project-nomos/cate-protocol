/**
 * CATEServer — high-level API for receiving and validating CATE messages.
 *
 * Usage:
 *   const server = new CATEServer({
 *     identity: { did: myDID, keystore },
 *     policy: { rules: [...] },
 *     onMessage: async (envelope) => { ... },
 *   });
 *   await server.listen({ transport: new HttpTransport({ port: 8800 }) });
 */

import type { CATEEnvelope } from "./types/envelope.js";
import type { PolicyConfig, TrustTier } from "./types/policy.js";
import { PolicyEngine } from "./policy/engine.js";
import { RateLimiter } from "./policy/rate-limiter.js";
import type { Keystore } from "./identity/keystore.js";
import type { Transport, TransportOptions } from "./transport/base.js";

export interface CATEServerConfig {
  identity: {
    did: string;
    keystore: Keystore;
  };
  policy?: PolicyConfig;
  onMessage: (
    envelope: CATEEnvelope,
    context: MessageContext,
  ) => void | Promise<void>;
  onError?: (error: Error) => void;
  resolveTrustTier?: (senderDid: string) => TrustTier | Promise<TrustTier>;
}

export interface MessageContext {
  senderDid: string;
  trustTier: TrustTier;
  policyAction: "allow" | "deny" | "require_approval" | "require_stamp";
  matchedRule?: string;
}

export class CATEServer {
  private config: CATEServerConfig;
  private policyEngine: PolicyEngine;
  private rateLimiter = new RateLimiter();
  private transport?: Transport;

  constructor(config: CATEServerConfig) {
    this.config = config;
    this.policyEngine = new PolicyEngine(
      config.policy ?? { default_action: "allow", rules: [] },
    );
  }

  /**
   * Start listening for incoming CATE envelopes.
   */
  async listen(params: {
    transport: Transport;
    options?: TransportOptions;
  }): Promise<void> {
    this.transport = params.transport;

    params.transport.on({
      onMessage: async (envelope) => {
        await this.handleEnvelope(envelope);
      },
      onError: (error) => {
        this.config.onError?.(error);
      },
      onClose: () => {},
    });

    await params.transport.listen(params.options);
  }

  /**
   * Stop the server.
   */
  async close(): Promise<void> {
    await this.transport?.close();
  }

  private async handleEnvelope(envelope: CATEEnvelope): Promise<void> {
    const senderDid = envelope.parties.from.did;

    // Verify recipient
    if (envelope.parties.to.did !== this.config.identity.did) {
      this.config.onError?.(
        new Error(`Envelope addressed to ${envelope.parties.to.did}, not ${this.config.identity.did}`),
      );
      return;
    }

    // Check TTL
    const sent = new Date(envelope.header.timestamp);
    const ttlMs = envelope.header.ttl_seconds * 1000;
    if (Date.now() - sent.getTime() > ttlMs) {
      this.config.onError?.(new Error("Envelope TTL expired"));
      return;
    }

    // Resolve trust tier
    const trustTier = this.config.resolveTrustTier
      ? await this.config.resolveTrustTier(senderDid)
      : "unknown";

    // Evaluate policy
    const decision = this.policyEngine.evaluate(envelope, trustTier);

    // Check rate limit
    const budget = this.policyEngine.getRateBudget(trustTier);
    if (!this.rateLimiter.allow(senderDid, budget)) {
      this.config.onError?.(new Error(`Rate limited: ${senderDid}`));
      return;
    }

    if (decision.action === "deny") {
      this.config.onError?.(
        new Error(`Policy denied: ${decision.reason ?? decision.matched_rule}`),
      );
      return;
    }

    const context: MessageContext = {
      senderDid,
      trustTier,
      policyAction: decision.action,
      matchedRule: decision.matched_rule,
    };

    await this.config.onMessage(envelope, context);
  }
}
