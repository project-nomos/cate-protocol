export {
  createDIDKey,
  resolveDID,
  createDID,
} from "./did-resolver.js";

export {
  issueVC,
  verifyVC,
  issueActsForVC,
  type IssueVCParams,
} from "./vc.js";

export {
  AgentCardSchema,
  createAgentCard,
  verifyAgentCard,
  type AgentCard,
} from "./agent-card.js";

export { MemoryKeystore, type Keystore, type KeyPair } from "./keystore.js";
