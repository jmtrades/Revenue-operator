/**
 * Continuity Environment — universal connector abstraction.
 * Any industry works with one or more sources. No full integration required for value.
 */

export type ConnectorKind = "communication" | "calendar" | "payment" | "conversation" | "identity" | "record";

/** Communication: send and receive messages (email, SMS, webhook). */
export interface CommunicationAdapter {
  kind: "communication";
  channel: string;
  send(params: { workspaceId: string; to: string; body: string; threadId?: string | null }): Promise<{ success: boolean; externalId?: string | null; error?: string }>;
  listRecentInbound?(params: { workspaceId: string; since: string; limit: number }): Promise<{ providerMessageId: string; from: string; to: string; body: string; receivedAt: string }[]>;
}

/** Calendar: read events, availability. */
export interface CalendarAdapter {
  kind: "calendar";
  getEvent?(params: { workspaceId: string; externalEventId: string }): Promise<{ exists: boolean; startAt?: string; endAt?: string; status?: string } | null>;
  listRecent?(params: { workspaceId: string; since: string; limit: number }): Promise<{ externalEventId: string; startAt: string; endAt: string }[]>;
}

/** Payment: charges, refunds, obligations. */
export interface PaymentAdapter {
  kind: "payment";
  listRecentCharges?(params: { workspaceId: string; since: string; limit: number }): Promise<{ externalId: string; amount: number; at: string }[]>;
  listRecentRefunds?(params: { workspaceId: string; since: string; limit: number }): Promise<{ externalId: string; at: string }[]>;
}

/** Conversation: canonical thread state (derived from signals). */
export interface ConversationAdapter {
  kind: "conversation";
  resolveThread?(params: { workspaceId: string; conversationId: string }): Promise<{ leadId: string; channel: string } | null>;
}

/** Identity: map external identifier to workspace/lead. */
export interface IdentityAdapter {
  kind: "identity";
  resolve?(params: { identifier: string; type: string }): Promise<{ workspaceId: string; leadId?: string | null } | null>;
}

/** Record: verifiable public record by external_ref. */
export interface RecordAdapter {
  kind: "record";
  getByExternalRef(externalRef: string): Promise<{ externalRef: string; subjectType: string; state: string; lastEventAt: string } | null>;
}

export type Adapter =
  | CommunicationAdapter
  | CalendarAdapter
  | PaymentAdapter
  | ConversationAdapter
  | IdentityAdapter
  | RecordAdapter;

const registry: Adapter[] = [];

export function registerAdapter(adapter: Adapter): void {
  registry.push(adapter);
}

export function getAdapters(kind: ConnectorKind): Adapter[] {
  return registry.filter((a) => a.kind === kind);
}

/** True if at least one source exists for the kind. System operates with one source. */
export function hasConnector(kind: ConnectorKind): boolean {
  return getAdapters(kind).length > 0;
}
