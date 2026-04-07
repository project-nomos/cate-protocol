/**
 * Verifiable Credentials — issuance and verification.
 *
 * Supports "acts-for" credentials (agent acting on behalf of user)
 * and capability attestations.
 */

import { bytesToHex } from "@noble/hashes/utils";
import type { VerifiableCredential } from "../types/did.js";
import type { Keystore } from "./keystore.js";

export interface IssueVCParams {
  issuerDid: string;
  issuerKeyId: string;
  subjectDid: string;
  credentialType: string;
  scope: string[];
  expiresInSeconds?: number;
}

/**
 * Issue a Verifiable Credential.
 *
 * Creates a VC asserting that the subject has certain capabilities,
 * signed by the issuer's key via the keystore.
 */
export async function issueVC(
  keystore: Keystore,
  params: IssueVCParams,
): Promise<VerifiableCredential> {
  const now = new Date();
  const expiry = params.expiresInSeconds
    ? new Date(now.getTime() + params.expiresInSeconds * 1000)
    : undefined;

  const credential: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ["VerifiableCredential", params.credentialType],
    issuer: params.issuerDid,
    issuanceDate: now.toISOString(),
    expirationDate: expiry?.toISOString(),
    credentialSubject: {
      id: params.subjectDid,
      type: params.credentialType,
      scope: params.scope,
      delegatedBy: params.issuerDid,
    },
  };

  // Create proof by signing the credential
  const credentialBytes = new TextEncoder().encode(
    JSON.stringify({
      ...credential,
      proof: undefined,
    }),
  );

  const signature = await keystore.sign(params.issuerKeyId, credentialBytes);

  credential.proof = {
    type: "Ed25519Signature2020",
    created: now.toISOString(),
    verificationMethod: `${params.issuerDid}#${params.issuerKeyId}`,
    proofPurpose: "assertionMethod",
    proofValue: bytesToHex(signature),
  };

  return credential;
}

/**
 * Verify a Verifiable Credential's proof.
 *
 * Checks:
 * - Proof exists and has required fields
 * - Signature is valid against issuer's public key
 * - Credential is not expired
 */
export async function verifyVC(
  keystore: Keystore,
  credential: VerifiableCredential,
  issuerPublicKey: Uint8Array,
): Promise<{ valid: boolean; reason?: string }> {
  if (!credential.proof) {
    return { valid: false, reason: "No proof present" };
  }

  // Check expiration
  if (credential.expirationDate) {
    const expiry = new Date(credential.expirationDate);
    if (expiry.getTime() < Date.now()) {
      return { valid: false, reason: "Credential expired" };
    }
  }

  // Reconstruct the signed payload
  const credentialWithoutProof = { ...credential, proof: undefined };
  const credentialBytes = new TextEncoder().encode(
    JSON.stringify(credentialWithoutProof),
  );

  // Verify signature
  if (!credential.proof.proofValue) {
    return { valid: false, reason: "No proof value" };
  }

  const signature = hexToBytes(credential.proof.proofValue);
  const valid = await keystore.verify(issuerPublicKey, credentialBytes, signature);

  return valid ? { valid: true } : { valid: false, reason: "Invalid signature" };
}

/**
 * Create an "acts-for" VC — the most common credential type.
 * Asserts that an agent acts on behalf of a user.
 */
export async function issueActsForVC(
  keystore: Keystore,
  params: {
    userDid: string;
    userKeyId: string;
    agentDid: string;
    scope: string[];
    expiresInSeconds?: number;
  },
): Promise<VerifiableCredential> {
  return issueVC(keystore, {
    issuerDid: params.userDid,
    issuerKeyId: params.userKeyId,
    subjectDid: params.agentDid,
    credentialType: "ActsForCredential",
    scope: params.scope,
    expiresInSeconds: params.expiresInSeconds ?? 86400 * 30, // 30 days default
  });
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
