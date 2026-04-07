// Main entry point — re-exports from all modules

// Client/Server
export { CATEClient, type CATEClientConfig, type SendParams } from "./client.js";
export {
  CATEServer,
  type CATEServerConfig,
  type MessageContext,
} from "./server.js";

// Types (most commonly needed)
export {
  CATEEnvelopeSchema,
  createEnvelope,
  type CATEEnvelope,
  type Party,
  type Intent,
} from "./types/envelope.js";

// Identity
export {
  createDID,
  createDIDKey,
  resolveDID,
  issueVC,
  issueActsForVC,
  verifyVC,
  createAgentCard,
  verifyAgentCard,
  MemoryKeystore,
  type Keystore,
  type AgentCard,
} from "./identity/index.js";

// Stamps
export {
  createPoWStamp,
  verifyPoWStamp,
  createMicropaymentStamp,
  verifyMicropaymentStamp,
  verifyStamp,
} from "./stamps/index.js";

// Policy
export { PolicyEngine } from "./policy/engine.js";
export { RateLimiter } from "./policy/rate-limiter.js";
export { classifyIntent } from "./policy/intent.js";
export { ConsentManager } from "./policy/consent.js";

// Transport
export { Transport } from "./transport/base.js";
export { HttpTransport } from "./transport/http.js";

// Adapters
export { wrapA2ATask, unwrapA2ATask } from "./adapters/a2a.js";
export {
  wrapMCPToolCall,
  wrapMCPToolResult,
  unwrapMCPToolCall,
  unwrapMCPToolResult,
} from "./adapters/mcp.js";
