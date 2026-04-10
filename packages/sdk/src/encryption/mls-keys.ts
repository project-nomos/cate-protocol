/**
 * MLS key management — KeyPackage generation and management.
 *
 * Note: Full MLS (RFC 9420) requires a dedicated library.
 * This module provides the key management primitives and
 * abstractions that a real MLS implementation would use.
 * The actual MLS ratchet tree and group operations are
 * stubbed pending a mature JS MLS library.
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import type { Keystore } from "../identity/keystore.js";

export interface KeyPackage {
  id: string;
  did: string;
  keyId: string;
  publicKey: Uint8Array;
  signatureKey: Uint8Array;
  cipherSuite: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Generate a KeyPackage for MLS group participation.
 */
export async function generateKeyPackage(
  keystore: Keystore,
  params: {
    did: string;
    keyId: string;
    cipherSuite?: string;
    expiresInSeconds?: number;
  },
): Promise<KeyPackage> {
  const key = await keystore.getKey(params.keyId);
  if (!key) {
    throw new Error(`Key not found: ${params.keyId}`);
  }

  const ttl = params.expiresInSeconds ?? 86400 * 30; // 30 days default
  const now = new Date();

  const id = bytesToHex(
    sha256(new TextEncoder().encode(`${params.did}:${params.keyId}:${now.toISOString()}`)),
  ).substring(0, 32);

  return {
    id,
    did: params.did,
    keyId: params.keyId,
    publicKey: key.publicKey,
    signatureKey: key.publicKey,
    cipherSuite: params.cipherSuite ?? "MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519",
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttl * 1000),
  };
}

/**
 * Validate a KeyPackage.
 */
export function validateKeyPackage(pkg: KeyPackage): {
  valid: boolean;
  reason?: string;
} {
  if (pkg.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "KeyPackage expired" };
  }

  if (!pkg.publicKey || pkg.publicKey.length === 0) {
    return { valid: false, reason: "Missing public key" };
  }

  if (!pkg.did.startsWith("did:")) {
    return { valid: false, reason: "Invalid DID format" };
  }

  return { valid: true };
}
