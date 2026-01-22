// New general agent exports (functions, not agent instance)
export {
  type AgentContext,
  buildSystemPrompt,
  getGeneralAgentTools,
} from "./general";

// Legacy agents (kept for reference, not currently used)
export { secretaryAgent } from "./secretary";
export { studyAgent } from "./study";

// Triage agent (currently disabled)
export { triageAgent } from "./triage";
