/**
 * Awareness timing: communicate only when a human would naturally feel relief.
 * Relief events, immediate delivery rule, escalation contrast, removal sensitivity.
 * No dashboards, no scheduled summaries. Silence when no relief.
 */

export {
  recordReliefEvent,
  deliverReliefEvent,
  getLastReliefSentAt,
  getReliefCountLast24h,
  maybeSendEscalationContrast,
  maybeSendRemovalSensitivity,
} from "./relief-events";
