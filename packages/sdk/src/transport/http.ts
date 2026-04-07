/**
 * HTTP transport — reference implementation using fetch API.
 *
 * - Outbound: POST with JSON body
 * - Inbound: HTTP server accepting POST at configurable path
 *
 * For real-time bidirectional communication, use SSE or WebSocket.
 * This transport is suitable for request/response patterns.
 */

import { CATEEnvelopeSchema, type CATEEnvelope } from "../types/envelope.js";
import { Transport, type TransportOptions } from "./base.js";

export interface HttpTransportConfig {
  /** Port to listen on for incoming envelopes */
  port?: number;
  /** Path to accept incoming envelopes (default: /cate) */
  path?: string;
  /** Base URL for outbound requests */
  baseUrl?: string;
}

export class HttpTransport extends Transport {
  private config: HttpTransportConfig;
  private server?: { close: () => void };

  constructor(config: HttpTransportConfig = {}) {
    super();
    this.config = {
      port: config.port ?? 8800,
      path: config.path ?? "/cate",
      baseUrl: config.baseUrl,
    };
  }

  async listen(_options?: TransportOptions): Promise<void> {
    // Node.js HTTP server — created dynamically to avoid
    // requiring http module at import time
    const { createServer } = await import("node:http");

    const server = createServer(async (req, res) => {
      if (req.method !== "POST" || req.url !== this.config.path) {
        res.writeHead(404);
        res.end();
        return;
      }

      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = Buffer.concat(chunks).toString("utf-8");
        const envelope = CATEEnvelopeSchema.parse(JSON.parse(body));

        await this.events?.onMessage(envelope);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "accepted" }));
      } catch (err) {
        this.events?.onError(
          err instanceof Error ? err : new Error(String(err)),
        );
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid envelope" }));
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(this.config.port, () => resolve());
    });

    this.server = server;
  }

  async send(envelope: CATEEnvelope, peerEndpoint: string): Promise<void> {
    const url = peerEndpoint.startsWith("http")
      ? peerEndpoint
      : `${this.config.baseUrl ?? "http://localhost:8800"}${peerEndpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });

    if (!response.ok) {
      throw new Error(`HTTP transport send failed: ${response.status}`);
    }
  }

  async close(): Promise<void> {
    this.server?.close();
  }
}
