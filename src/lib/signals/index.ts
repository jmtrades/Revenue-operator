/**
 * Signal Layer — Ground Truth
 * All business events normalize to canonical signals. No business logic in connectors.
 */

export {
  CANONICAL_SIGNAL_TYPES,
  idempotencyKey,
  type CanonicalSignal,
  type CanonicalSignalType,
  type CanonicalSignalPayload,
} from "./types";
export { insertSignal, getSignalsForLead, type InsertSignalResult } from "./store";
