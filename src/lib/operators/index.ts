/**
 * Revenue Performance Operators — four coordinated operators.
 * Each schedules actions independently of inbound messages.
 * Decision Layer: trigger, cooldown, max attempts, escalation (see contracts).
 */

export { getCaptureOperatorRole } from "./capture-operator";
export { runConversionOperator } from "./conversion-operator";
export { runAttendanceOperator, recordNoShow } from "./attendance-operator";
export {
  runRetentionCheckIns,
  runRetentionReactivation,
  runRetentionNoShowRecovery,
} from "./retention-operator";
export {
  OPERATOR_IDS,
  OPERATOR_CONTRACTS,
  OPERATOR_TRIGGER_SIGNALS,
  getOperatorContract,
  getOperatorsForState,
  type OperatorId,
  type OperatorContract,
} from "./contracts";
