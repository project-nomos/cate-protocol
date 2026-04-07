/**
 * A2A (Agent-to-Agent) bridge adapter.
 *
 * Wraps A2A task/message payloads inside CATE envelopes,
 * preserving Agent Card discovery semantics while adding
 * identity, encryption, and stamps.
 */

import { z } from "zod";
import type { CATEEnvelope, Party, Intent } from "../types/envelope.js";
import { createEnvelope } from "../types/envelope.js";

/** A2A Agent Card (simplified, A2A-compatible) */
export const A2AAgentCardSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  version: z.string().default("1.0"),
  capabilities: z
    .object({
      streaming: z.boolean().default(false),
      pushNotifications: z.boolean().default(false),
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
  authentication: z
    .object({
      schemes: z.array(z.string()).default([]),
    })
    .optional(),
});

export type A2AAgentCard = z.infer<typeof A2AAgentCardSchema>;

/** A2A Task (simplified) */
export const A2ATaskSchema = z.object({
  id: z.string(),
  status: z.enum(["submitted", "working", "completed", "failed", "canceled"]),
  messages: z.array(
    z.object({
      role: z.enum(["user", "agent"]),
      parts: z.array(
        z.object({
          type: z.string(),
          text: z.string().optional(),
          data: z.unknown().optional(),
        }),
      ),
    }),
  ),
  artifacts: z
    .array(
      z.object({
        name: z.string(),
        parts: z.array(z.object({ type: z.string(), data: z.unknown() })),
      }),
    )
    .optional(),
});

export type A2ATask = z.infer<typeof A2ATaskSchema>;

/**
 * Wrap an A2A task as a CATE envelope payload.
 */
export function wrapA2ATask(params: {
  task: A2ATask;
  from: Party;
  to: Party & { endpoint_hint?: string };
  intent?: Intent;
  thread_id?: string;
}): CATEEnvelope {
  return createEnvelope({
    from: params.from,
    to: params.to,
    intent: params.intent ?? "transactional",
    payload: JSON.stringify({
      type: "a2a/task",
      task: params.task,
    }),
    thread_id: params.thread_id ?? params.task.id,
  });
}

/**
 * Extract an A2A task from a CATE envelope payload.
 */
export function unwrapA2ATask(envelope: CATEEnvelope): A2ATask | null {
  if (!envelope.payload) return null;
  try {
    const parsed = JSON.parse(envelope.payload);
    if (parsed.type !== "a2a/task") return null;
    return A2ATaskSchema.parse(parsed.task);
  } catch {
    return null;
  }
}
