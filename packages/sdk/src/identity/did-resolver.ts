/**
 * DID Resolver — resolves did:key and did:web methods to DID Documents.
 */

import type { DIDDocument, ParsedDID } from "../types/did.js";
import { parseDID } from "../types/did.js";
import type { Keystore } from "./keystore.js";

/**
 * Create a did:key DID from an Ed25519 public key.
 *
 * did:key uses the multicodec prefix 0xed01 for Ed25519.
 */
export function createDIDKey(publicKey: Uint8Array): string {
  // Multicodec prefix for Ed25519: 0xed, 0x01
  const multicodec = new Uint8Array([0xed, 0x01, ...publicKey]);
  // Base58btc multibase prefix: 'z'
  const encoded = base58btcEncode(multicodec);
  return `did:key:z${encoded}`;
}

/**
 * Resolve a DID to its DID Document.
 *
 * Supports did:key (local resolution) and did:web (HTTP fetch).
 */
export async function resolveDID(did: string): Promise<DIDDocument> {
  const parsed = parseDID(did);

  switch (parsed.method) {
    case "key":
      return resolveKeyDID(parsed);
    case "web":
      return resolveWebDID(parsed);
    default:
      throw new Error(`Unsupported DID method: ${parsed.method}`);
  }
}

/**
 * Create a DID from a keystore key, returning both the DID and document.
 */
export async function createDID(
  keystore: Keystore,
  keyId: string,
): Promise<{ did: string; document: DIDDocument }> {
  const keyPair = await keystore.generateKey(keyId);
  const did = createDIDKey(keyPair.publicKey);
  const document = await resolveDID(did);
  return { did, document };
}

// --- Internal ---

function resolveKeyDID(parsed: ParsedDID): DIDDocument {
  const did = parsed.full.split("#")[0];
  const keyId = `${did}#${parsed.id}`;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: did,
    verificationMethod: [
      {
        id: keyId,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyMultibase: `z${parsed.id}`,
      },
    ],
    authentication: [keyId],
    assertionMethod: [keyId],
    keyAgreement: [],
    service: [],
  };
}

async function resolveWebDID(parsed: ParsedDID): Promise<DIDDocument> {
  // did:web:example.com:path → https://example.com/path/did.json
  // did:web:example.com → https://example.com/.well-known/did.json
  const parts = parsed.id.split(":");
  const host = parts[0].replace(/%3A/g, ":");
  const path = parts.length > 1 ? `/${parts.slice(1).join("/")}` : "/.well-known";

  const url = `https://${host}${path}/did.json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to resolve did:web — HTTP ${response.status} from ${url}`);
  }

  return (await response.json()) as DIDDocument;
}

// Simple base58btc encoder (Bitcoin alphabet)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58btcEncode(bytes: Uint8Array): string {
  // Convert bytes to a big integer
  let num = 0n;
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }

  // Convert to base58
  const chars: string[] = [];
  while (num > 0n) {
    const remainder = Number(num % 58n);
    chars.unshift(BASE58_ALPHABET[remainder]);
    num = num / 58n;
  }

  // Preserve leading zeros
  for (const byte of bytes) {
    if (byte === 0) {
      chars.unshift("1");
    } else {
      break;
    }
  }

  return chars.join("");
}
