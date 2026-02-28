/**
 * Universal commercial memory per lead. Structured only; no freeform text.
 */

export { getLeadMemory, upsertLeadMemory, recordLeadReaction, getLeadMemoryContextForReasoning } from "./store";
export type {
  LeadMemoryRow,
  LeadMemoryUpdate,
  DisclosedPriceRange,
  ObjectionRecord,
  CommitmentRecord,
  DisclosureAckRecord,
  ConsentRecord,
  EmotionalProfile,
  LifecycleNote,
} from "./types";
