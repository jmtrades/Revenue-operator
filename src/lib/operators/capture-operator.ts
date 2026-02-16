/**
 * CaptureOperator — handles inbound enquiries.
 * Delegates to existing pipeline (processNormalizedInbound / processWebhookJob).
 * No separate scheduling; inbound events trigger the pipeline.
 */

export const CAPTURE_OPERATOR = "CaptureOperator";

/** Inbound handling is event-driven; this operator is the named layer. */
export function getCaptureOperatorRole(): string {
  return CAPTURE_OPERATOR;
}
