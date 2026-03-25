/**
 * Work Unit: universal layer for request, commitment, negotiation, compliance, action, settlement.
 * Deterministic state machines only. Existing shared_transactions are work units of type shared_transaction.
 */

export {
  interpretInboundMessage,
  parseAndInterpret,
  IntentInterpreterSchema,
  type IntentInterpreterResult,
} from "./intent-interpreter";

export {
  WORK_UNIT_TYPES,
  WORK_UNIT_TYPE_DEFINITIONS,
  getWorkUnitTypeDefinition,
  isAllowedState,
} from "./types";
export type { WorkUnitType, WorkUnitTypeDefinition } from "./types";
