/**
 * MCP (Model Context Protocol) bridge adapter.
 *
 * Wraps MCP tool calls/results inside CATE envelopes,
 * requiring OAuth scopes for tool calls and enforcing
 * policy engine gates.
 */

import { z } from "zod";
import type { CATEEnvelope, Party } from "../types/envelope.js";
import { createEnvelope } from "../types/envelope.js";

/** MCP Tool Call */
export const MCPToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()).default({}),
});

export type MCPToolCall = z.infer<typeof MCPToolCallSchema>;

/** MCP Tool Result */
export const MCPToolResultSchema = z.object({
  content: z.array(
    z.object({
      type: z.enum(["text", "image", "resource"]),
      text: z.string().optional(),
      data: z.string().optional(),
      mimeType: z.string().optional(),
    }),
  ),
  isError: z.boolean().default(false),
});

export type MCPToolResult = z.infer<typeof MCPToolResultSchema>;

/**
 * Wrap an MCP tool call as a CATE envelope.
 */
export function wrapMCPToolCall(params: {
  tool: MCPToolCall;
  from: Party;
  to: Party & { endpoint_hint?: string };
  oauth_scopes?: string[];
  thread_id?: string;
}): CATEEnvelope {
  const envelope = createEnvelope({
    from: params.from,
    to: params.to,
    intent: "transactional",
    payload: JSON.stringify({
      type: "mcp/tool-call",
      tool: params.tool,
    }),
    thread_id: params.thread_id,
  });

  if (params.oauth_scopes) {
    envelope.policy.consent = {
      oauth_scopes: params.oauth_scopes,
    };
  }

  envelope.policy.action_class = "execute";

  return envelope;
}

/**
 * Wrap an MCP tool result as a CATE envelope.
 */
export function wrapMCPToolResult(params: {
  result: MCPToolResult;
  from: Party;
  to: Party & { endpoint_hint?: string };
  thread_id?: string;
}): CATEEnvelope {
  return createEnvelope({
    from: params.from,
    to: params.to,
    intent: "transactional",
    payload: JSON.stringify({
      type: "mcp/tool-result",
      result: params.result,
    }),
    thread_id: params.thread_id,
  });
}

/**
 * Extract MCP tool call from a CATE envelope.
 */
export function unwrapMCPToolCall(envelope: CATEEnvelope): MCPToolCall | null {
  if (!envelope.payload) return null;
  try {
    const parsed = JSON.parse(envelope.payload);
    if (parsed.type !== "mcp/tool-call") return null;
    return MCPToolCallSchema.parse(parsed.tool);
  } catch {
    return null;
  }
}

/**
 * Extract MCP tool result from a CATE envelope.
 */
export function unwrapMCPToolResult(envelope: CATEEnvelope): MCPToolResult | null {
  if (!envelope.payload) return null;
  try {
    const parsed = JSON.parse(envelope.payload);
    if (parsed.type !== "mcp/tool-result") return null;
    return MCPToolResultSchema.parse(parsed.result);
  } catch {
    return null;
  }
}
