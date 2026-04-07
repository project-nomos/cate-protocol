import { describe, it, expect } from "vitest";
import { CATEEnvelopeSchema, createEnvelope, type Party } from "./envelope.js";

const sender: Party = {
  did: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  key_id: "key-1",
};

const receiver: Party = {
  did: "did:web:example.com:agent",
  key_id: "key-2",
};

describe("CATEEnvelopeSchema", () => {
  it("validates a complete envelope", () => {
    const envelope = createEnvelope({
      from: sender,
      to: receiver,
      intent: "personal",
      payload: "Hello from my agent",
    });

    const result = CATEEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });

  it("rejects invalid DID in from party", () => {
    const result = CATEEnvelopeSchema.safeParse({
      header: {
        version: "1.0",
        msg_id: crypto.randomUUID(),
        thread_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ttl_seconds: 86400,
      },
      parties: {
        from: { did: "not-a-did", key_id: "k1" },
        to: { did: "did:key:abc", key_id: "k2" },
      },
      security: { channel: "none", envelope_sig: "" },
      policy: { intent: "personal", action_class: "inform", data_labels: ["none"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid intent", () => {
    const envelope = createEnvelope({
      from: sender,
      to: receiver,
      intent: "personal",
    });

    const modified = { ...envelope, policy: { ...envelope.policy, intent: "spam" } };
    const result = CATEEnvelopeSchema.safeParse(modified);
    expect(result.success).toBe(false);
  });

  it("createEnvelope generates valid UUIDs", () => {
    const envelope = createEnvelope({
      from: sender,
      to: receiver,
      intent: "transactional",
    });

    expect(envelope.header.msg_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(envelope.header.thread_id).toBeTruthy();
  });

  it("preserves thread_id when provided", () => {
    const threadId = "custom-thread-123";
    const envelope = createEnvelope({
      from: sender,
      to: receiver,
      intent: "system",
      thread_id: threadId,
    });

    expect(envelope.header.thread_id).toBe(threadId);
  });

  it("validates stamp fields", () => {
    const envelope = createEnvelope({
      from: sender,
      to: receiver,
      intent: "promotional",
    });

    envelope.stamp = {
      type: "pow",
      pow: {
        difficulty: 22,
        nonce: "abc123",
        hash: "00000abcdef",
      },
    };

    const result = CATEEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });
});
