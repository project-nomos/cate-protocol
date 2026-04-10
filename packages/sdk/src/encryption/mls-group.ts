/**
 * MLS group management — group creation, membership, and epoch tracking.
 *
 * This module provides the group state management layer for MLS.
 * Actual cryptographic operations (ratchet tree, HPKE) are abstracted
 * pending a mature JS MLS implementation.
 *
 * For 1:1 conversations, a 2-member MLS group is created (benefit:
 * forward secrecy + post-compromise security).
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import type { KeyPackage } from "./mls-keys.js";

export interface MLSGroupState {
  groupId: string;
  epoch: number;
  cipherSuite: string;
  members: MLSMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MLSMember {
  did: string;
  keyPackageId: string;
  addedAtEpoch: number;
  role: "admin" | "member";
}

/**
 * Create a new MLS group.
 */
export function createGroup(params: {
  creatorDid: string;
  creatorKeyPackage: KeyPackage;
  groupName?: string;
}): MLSGroupState {
  const now = new Date();
  const groupId = bytesToHex(
    sha256(
      new TextEncoder().encode(
        `${params.creatorDid}:${params.groupName ?? "default"}:${now.toISOString()}`,
      ),
    ),
  ).substring(0, 32);

  return {
    groupId,
    epoch: 0,
    cipherSuite: params.creatorKeyPackage.cipherSuite,
    members: [
      {
        did: params.creatorDid,
        keyPackageId: params.creatorKeyPackage.id,
        addedAtEpoch: 0,
        role: "admin",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add a member to the group (creates a new epoch).
 */
export function addMember(
  group: MLSGroupState,
  member: { did: string; keyPackage: KeyPackage },
): MLSGroupState {
  if (group.members.some((m) => m.did === member.did)) {
    throw new Error(`Member ${member.did} already in group`);
  }

  const newEpoch = group.epoch + 1;

  return {
    ...group,
    epoch: newEpoch,
    members: [
      ...group.members,
      {
        did: member.did,
        keyPackageId: member.keyPackage.id,
        addedAtEpoch: newEpoch,
        role: "member",
      },
    ],
    updatedAt: new Date(),
  };
}

/**
 * Remove a member from the group (creates a new epoch).
 */
export function removeMember(group: MLSGroupState, memberDid: string): MLSGroupState {
  if (!group.members.some((m) => m.did === memberDid)) {
    throw new Error(`Member ${memberDid} not in group`);
  }

  return {
    ...group,
    epoch: group.epoch + 1,
    members: group.members.filter((m) => m.did !== memberDid),
    updatedAt: new Date(),
  };
}

/**
 * Create a pairwise (1:1) MLS group between two agents.
 */
export function createPairwiseGroup(params: {
  initiatorDid: string;
  initiatorKeyPackage: KeyPackage;
  responderDid: string;
  responderKeyPackage: KeyPackage;
}): MLSGroupState {
  const group = createGroup({
    creatorDid: params.initiatorDid,
    creatorKeyPackage: params.initiatorKeyPackage,
    groupName: `pairwise:${params.initiatorDid}:${params.responderDid}`,
  });

  return addMember(group, {
    did: params.responderDid,
    keyPackage: params.responderKeyPackage,
  });
}

/**
 * Check if a DID is a member of the group.
 */
export function isMember(group: MLSGroupState, did: string): boolean {
  return group.members.some((m) => m.did === did);
}
