/**
 * Instant-install connector interfaces. All return raw events only.
 * Mapping into canonical signals happens in signal consumer layer.
 */

export interface EmailThreadRow {
  thread_id: string;
  subject?: string | null;
  last_at: string;
}

export interface EmailConnector {
  listRecentThreads(workspaceId: string, since: string, limit: number): Promise<EmailThreadRow[]>;
  listInboundMessages(workspaceId: string, since: string, limit: number): Promise<RawInboundMessage[]>;
  listOutboundMessages(workspaceId: string, since: string, limit: number): Promise<RawOutboundMessage[]>;
}

export interface RawInboundMessage {
  message_id: string;
  from: string;
  to: string;
  body: string;
  received_at: string;
  thread_id?: string | null;
}

export interface RawOutboundMessage {
  message_id: string;
  to: string;
  body: string;
  sent_at: string;
}

export interface CalendarEventRow {
  event_id: string;
  start_at: string;
  end_at: string;
  status?: string | null;
}

export interface AttendanceSignalRow {
  event_id: string;
  attended: boolean;
  at: string;
}

export interface CalendarConnector {
  listEvents(workspaceId: string, since: string, limit: number): Promise<CalendarEventRow[]>;
  listAttendanceSignals(workspaceId: string, since: string, limit: number): Promise<AttendanceSignalRow[]>;
}

export interface MessagingConnector {
  listInboundMessages(workspaceId: string, since: string, limit: number): Promise<RawInboundMessage[]>;
  listOutboundMessages(workspaceId: string, since: string, limit: number): Promise<RawOutboundMessage[]>;
}

export interface WebhookConnector {
  acceptEvent(payload: { workspace_id: string; kind: string; data: Record<string, unknown>; occurred_at?: string }): Promise<{ accepted: boolean; id?: string }>;
}

export type ConnectorKind = "email" | "calendar" | "messaging" | "webhook";
export type ConnectorImpl = EmailConnector | CalendarConnector | MessagingConnector | WebhookConnector;
