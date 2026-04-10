/**
 * CATEClient — high-level API for sending CATE messages.
 *
 * Usage:
 *   const client = new CATEClient({
 *     identity: { did: myDID, keystore },
 *   });
 *   await client.connect(new HttpTransport());
 *   await client.send({
 *     to: "did:web:other-agent.example.com",
 *     intent: "personal",
 *     content: "Hello from my agent",
 *   });
 */

import type { CATEEnvelope, Intent, Party } from "./types/envelope.js";
import { createEnvelope } from "./types/envelope.js";
import type { Keystore } from "./identity/keystore.js";
import type { Transport } from "./transport/base.js";
import { bytesToHex } from "@noble/hashes/utils";

export interface CATEClientConfig {
  identity: {
    did: string;
    keyId: string;
    keystore: Keystore;
  };
}

export interface SendParams {
  to: string;
  toKeyId?: string;
  endpoint: string;
  intent: Intent;
  content: string;
  thread_id?: string;
}

export class CATEClient {
  private config: CATEClientConfig;
  private transport?: Transport;

  constructor(config: CATEClientConfig) {
    this.config = config;
  }

  /**
   * Connect to a transport for sending messages.
   */
  async connect(transport: Transport): Promise<void> {
    this.transport = transport;
  }

  /**
   * Send a CATE envelope to a peer.
   */
  async send(params: SendParams): Promise<CATEEnvelope> {
    if (!this.transport) {
      throw new Error("Not connected — call connect() first");
    }

    const from: Party = {
      did: this.config.identity.did,
      key_id: this.config.identity.keyId,
    };

    const to: Party & { endpoint_hint?: string } = {
      did: params.to,
      key_id: params.toKeyId ?? "default",
      endpoint_hint: params.endpoint,
    };

    const envelope = createEnvelope({
      from,
      to,
      intent: params.intent,
      payload: params.content,
      thread_id: params.thread_id,
    });

    // Sign the envelope
    const sigData = new TextEncoder().encode(
      JSON.stringify({
        header: envelope.header,
        policy: envelope.policy,
        stamp: envelope.stamp,
      }),
    );

    const signature = await this.config.identity.keystore.sign(this.config.identity.keyId, sigData);
    envelope.security.envelope_sig = bytesToHex(signature);

    await this.transport.send(envelope, params.endpoint);

    return envelope;
  }

  /**
   * Disconnect from the transport.
   */
  async disconnect(): Promise<void> {
    await this.transport?.close();
    this.transport = undefined;
  }
}
