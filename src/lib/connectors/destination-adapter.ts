/**
 * DestinationAdapter — outbound: send message, update CRM, append note, update stage.
 * Connectors implement this for each destination (SMS, email, HubSpot, etc.).
 */

export interface SendMessageInput {
  workspace_id: string;
  channel: string;
  to: string;
  body: string;
  thread_id?: string | null;
}

export interface DestinationAdapterResult {
  success: boolean;
  external_id?: string | null;
  error?: string;
}

/**
 * Send a message to the lead (SMS, email, etc.).
 */
export type SendMessage = (input: SendMessageInput) => Promise<DestinationAdapterResult>;

/**
 * Update CRM record (stage, custom fields).
 */
export type UpdateCrm = (workspaceId: string, leadId: string, payload: { stage?: string; [k: string]: unknown }) => Promise<DestinationAdapterResult>;

/**
 * Append a note to the lead/contact in the destination system.
 */
export type AppendNote = (workspaceId: string, leadId: string, note: string) => Promise<DestinationAdapterResult>;

export interface DestinationAdapter {
  channel: string;
  sendMessage: SendMessage;
  updateCrm?: UpdateCrm;
  appendNote?: AppendNote;
}
