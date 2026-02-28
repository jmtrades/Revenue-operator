/**
 * Call outcome — structured result from place_outbound_call executor. No freeform.
 */

export interface CallOutcomeInput {
  workspace_id: string;
  work_unit_id?: string | null;
  lead_id?: string | null;
  conversation_id?: string | null;
  duration_seconds?: number | null;
  disposition?: string | null;
  objections_tags?: string[];
  commitment_outcome?: string | null;
  sentiment_score?: number | null;
  consent_confirmed?: boolean | null;
  compliance_confirmed?: boolean | null;
}
