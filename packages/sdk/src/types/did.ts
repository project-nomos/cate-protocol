/**
 * DID (Decentralized Identifier) types following W3C DID Core.
 */

import { z } from "zod";

export const VerificationMethodSchema = z.object({
  id: z.string(),
  type: z.string(),
  controller: z.string().startsWith("did:"),
  publicKeyMultibase: z.string().optional(),
  publicKeyJwk: z.record(z.unknown()).optional(),
});

export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;

export const ServiceEndpointSchema = z.object({
  id: z.string(),
  type: z.string(),
  serviceEndpoint: z.union([z.string().url(), z.array(z.string().url())]),
});

export type ServiceEndpoint = z.infer<typeof ServiceEndpointSchema>;

export const DIDDocumentSchema = z.object({
  "@context": z
    .union([z.string(), z.array(z.string())])
    .default("https://www.w3.org/ns/did/v1"),
  id: z.string().startsWith("did:"),
  controller: z
    .union([z.string().startsWith("did:"), z.array(z.string().startsWith("did:"))])
    .optional(),
  verificationMethod: z.array(VerificationMethodSchema).default([]),
  authentication: z.array(z.union([z.string(), VerificationMethodSchema])).default([]),
  assertionMethod: z.array(z.union([z.string(), VerificationMethodSchema])).default([]),
  keyAgreement: z.array(z.union([z.string(), VerificationMethodSchema])).default([]),
  service: z.array(ServiceEndpointSchema).default([]),
});

export type DIDDocument = z.infer<typeof DIDDocumentSchema>;

export const VerifiableCredentialSchema = z.object({
  "@context": z
    .union([z.string(), z.array(z.string())])
    .default(["https://www.w3.org/2018/credentials/v1"]),
  id: z.string().optional(),
  type: z.array(z.string()).default(["VerifiableCredential"]),
  issuer: z.union([z.string().startsWith("did:"), z.object({ id: z.string().startsWith("did:") })]),
  issuanceDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  credentialSubject: z.object({
    id: z.string().startsWith("did:"),
    type: z.string(),
    scope: z.array(z.string()).default([]),
    delegatedBy: z.string().startsWith("did:").optional(),
  }),
  proof: z
    .object({
      type: z.string(),
      created: z.string().datetime(),
      verificationMethod: z.string(),
      proofPurpose: z.string().default("assertionMethod"),
      jws: z.string().optional(),
      proofValue: z.string().optional(),
    })
    .optional(),
});

export type VerifiableCredential = z.infer<typeof VerifiableCredentialSchema>;

/** Supported DID methods */
export type DIDMethod = "key" | "web";

/** Parsed DID components */
export interface ParsedDID {
  method: DIDMethod;
  id: string;
  fragment?: string;
  full: string;
}

/** Parse a DID string into its components */
export function parseDID(did: string): ParsedDID {
  const match = did.match(/^did:(\w+):(.+?)(?:#(.+))?$/);
  if (!match) {
    throw new Error(`Invalid DID format: ${did}`);
  }
  return {
    method: match[1] as DIDMethod,
    id: match[2],
    fragment: match[3],
    full: did,
  };
}
