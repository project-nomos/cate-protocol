/**
 * Agent Card — A2A-compatible signed agent discovery card.
 *
 * Extends A2A Agent Card semantics by binding to a DID document
 * and including VC chain for capability attestation.
 */

import { z } from "zod";
import { bytesToHex } from "@noble/hashes/utils";
import type { Keystore } from "./keystore.js";

export const AgentCardSchema = z.object({
  did: z.string().startsWith("did:"),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default("1.0"),
  url: z.string().url(),
  capabilities: z
    .object({
      streaming: z.boolean().default(false),
      pushNotifications: z.boolean().default(false),
      encryption: z.boolean().default(false),
      stamps: z.boolean().default(false),
    })
    .default({}),
  skills: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  endpoints: z
    .object({
      cate: z.string().url().optional(),
      a2a: z.string().url().optional(),
      mcp: z.string().url().optional(),
    })
    .default({}),
  vc_chain: z.array(z.string()).default([]),
  signature: z.string().optional(),
});

export type AgentCard = z.infer<typeof AgentCardSchema>;

/**
 * Create a signed agent card.
 */
export async function createAgentCard(
  keystore: Keystore,
  keyId: string,
  params: Omit<AgentCard, "signature">,
): Promise<AgentCard> {
  const cardWithoutSig = { ...params, signature: undefined };
  const cardBytes = new TextEncoder().encode(JSON.stringify(cardWithoutSig));
  const signature = await keystore.sign(keyId, cardBytes);

  return {
    ...params,
    signature: bytesToHex(signature),
  };
}

/**
 * Verify an agent card's signature.
 */
export async function verifyAgentCard(
  keystore: Keystore,
  card: AgentCard,
  publicKey: Uint8Array,
): Promise<boolean> {
  if (!card.signature) return false;

  const cardWithoutSig = { ...card, signature: undefined };
  const cardBytes = new TextEncoder().encode(JSON.stringify(cardWithoutSig));

  const sigBytes = hexToBytes(card.signature);
  return keystore.verify(publicKey, cardBytes, sigBytes);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
