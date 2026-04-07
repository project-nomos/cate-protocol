/**
 * Abstract transport interface.
 *
 * Transports handle the actual sending/receiving of CATE envelopes
 * over a network protocol. The SDK provides an HTTP reference
 * transport; consumers can implement custom transports.
 */

import type { CATEEnvelope } from "../types/envelope.js";

export interface TransportOptions {
  /** Connection timeout in milliseconds */
  timeout?: number;
}

export interface TransportEvents {
  onMessage: (envelope: CATEEnvelope) => void | Promise<void>;
  onError: (error: Error) => void;
  onClose: () => void;
}

/**
 * Abstract transport — implement to add new wire protocols.
 */
export abstract class Transport {
  protected events?: TransportEvents;

  /** Start listening for incoming envelopes */
  abstract listen(options?: TransportOptions): Promise<void>;

  /** Send an envelope to a peer */
  abstract send(envelope: CATEEnvelope, peerEndpoint: string): Promise<void>;

  /** Close the transport */
  abstract close(): Promise<void>;

  /** Register event handlers */
  on(events: TransportEvents): void {
    this.events = events;
  }
}
