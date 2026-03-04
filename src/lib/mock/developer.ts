/**
 * Mock data for /app/developer — API keys, webhooks, event log.
 * Frontend-only; no backend.
 */

export type ApiKeyPermission = "read" | "read_write" | "admin";

export interface ApiKeyRow {
  id: string;
  label: string;
  keyPrefix: string;
  keySuffix: string;
  fullKey: string;
  permission: ApiKeyPermission;
  createdAt: string;
  lastUsedAt: string;
  status: "active" | "revoked";
}

export const MOCK_API_KEYS: ApiKeyRow[] = [
  {
    id: "key-1",
    label: "Production",
    keyPrefix: "rt_live_",
    keySuffix: "a3f2",
    fullKey: "rt_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxa3f2",
    permission: "admin",
    createdAt: "2025-01-15T10:00:00Z",
    lastUsedAt: new Date().toISOString(),
    status: "active",
  },
  {
    id: "key-2",
    label: "Staging",
    keyPrefix: "rt_test_",
    keySuffix: "b4e1",
    fullKey: "rt_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxb4e1",
    permission: "read_write",
    createdAt: "2025-02-20T14:30:00Z",
    lastUsedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  },
];

export type WebhookEvent =
  | "call.started"
  | "call.completed"
  | "call.failed"
  | "lead.created"
  | "appointment.booked"
  | "sentiment.flagged"
  | "campaign.completed"
  | "agent.error";

export interface WebhookDelivery {
  id: string;
  eventType: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
  payload: string;
}

export interface WebhookRow {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  status: "active" | "paused";
  lastDeliveryAt: string;
  lastDeliveryStatus: number;
  deliveries: WebhookDelivery[];
}

export const MOCK_WEBHOOK_EVENTS: WebhookEvent[] = [
  "call.started",
  "call.completed",
  "call.failed",
  "lead.created",
  "appointment.booked",
  "sentiment.flagged",
  "campaign.completed",
  "agent.error",
];

export const MOCK_WEBHOOKS: WebhookRow[] = [
  {
    id: "wh-1",
    url: "https://hooks.zapier.com/hooks/catch/12345/abcdef/",
    secret: "whsec_8f7e6d5c4b3a2910fedcba9876543210",
    events: ["call.completed", "lead.created"],
    status: "active",
    lastDeliveryAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    lastDeliveryStatus: 200,
    deliveries: [
      {
        id: "del-1",
        eventType: "lead.created",
        statusCode: 200,
        responseTimeMs: 142,
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        payload: JSON.stringify({ event: "lead.created", data: { lead_id: "lead_abc", name: "Jane" } }, null, 2),
      },
      {
        id: "del-2",
        eventType: "call.completed",
        statusCode: 200,
        responseTimeMs: 98,
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        payload: JSON.stringify({ event: "call.completed", data: { call_id: "call_xyz", duration_sec: 120 } }, null, 2),
      },
      {
        id: "del-3",
        eventType: "lead.created",
        statusCode: 500,
        responseTimeMs: 5000,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        payload: JSON.stringify({ event: "lead.created", data: { lead_id: "lead_def" } }, null, 2),
      },
      {
        id: "del-4",
        eventType: "call.completed",
        statusCode: 200,
        responseTimeMs: 105,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        payload: JSON.stringify({ event: "call.completed", data: { call_id: "call_123" } }, null, 2),
      },
      {
        id: "del-5",
        eventType: "lead.created",
        statusCode: 200,
        responseTimeMs: 88,
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        payload: JSON.stringify({ event: "lead.created", data: { lead_id: "lead_ghi" } }, null, 2),
      },
    ],
  },
];

export type EventLogKind = "api_call" | "webhook_delivery";
export type EventLogStatus = "success" | "failed";

export interface EventLogRow {
  id: string;
  kind: EventLogKind;
  timestamp: string;
  method?: string;
  endpoint?: string;
  webhookUrl?: string;
  eventType?: string;
  statusCode: number;
  responseTimeMs: number;
  status: EventLogStatus;
}

const now = Date.now();
const hour = 60 * 60 * 1000;

export const MOCK_EVENT_LOG: EventLogRow[] = [
  { id: "ev-1", kind: "api_call", timestamp: new Date(now - 2 * 60 * 1000).toISOString(), method: "GET", endpoint: "/v1/calls", statusCode: 200, responseTimeMs: 45, status: "success" },
  { id: "ev-2", kind: "webhook_delivery", timestamp: new Date(now - 3 * 60 * 1000).toISOString(), webhookUrl: "https://hooks.zapier.com/...", eventType: "lead.created", statusCode: 200, responseTimeMs: 142, status: "success" },
  { id: "ev-3", kind: "api_call", timestamp: new Date(now - 15 * 60 * 1000).toISOString(), method: "POST", endpoint: "/v1/leads", statusCode: 201, responseTimeMs: 89, status: "success" },
  { id: "ev-4", kind: "webhook_delivery", timestamp: new Date(now - 45 * 60 * 1000).toISOString(), webhookUrl: "https://hooks.zapier.com/...", eventType: "call.completed", statusCode: 200, responseTimeMs: 98, status: "success" },
  { id: "ev-5", kind: "api_call", timestamp: new Date(now - 1 * hour).toISOString(), method: "GET", endpoint: "/v1/agents", statusCode: 200, responseTimeMs: 32, status: "success" },
  { id: "ev-6", kind: "api_call", timestamp: new Date(now - 1.5 * hour).toISOString(), method: "POST", endpoint: "/v1/calls", statusCode: 400, responseTimeMs: 12, status: "failed" },
  { id: "ev-7", kind: "webhook_delivery", timestamp: new Date(now - 2 * hour).toISOString(), webhookUrl: "https://hooks.zapier.com/...", eventType: "lead.created", statusCode: 500, responseTimeMs: 5000, status: "failed" },
  { id: "ev-8", kind: "api_call", timestamp: new Date(now - 2.5 * hour).toISOString(), method: "GET", endpoint: "/v1/calls?limit=20", statusCode: 200, responseTimeMs: 56, status: "success" },
  { id: "ev-9", kind: "api_call", timestamp: new Date(now - 3 * hour).toISOString(), method: "GET", endpoint: "/v1/leads", statusCode: 200, responseTimeMs: 41, status: "success" },
  { id: "ev-10", kind: "webhook_delivery", timestamp: new Date(now - 3 * hour).toISOString(), webhookUrl: "https://hooks.zapier.com/...", eventType: "call.completed", statusCode: 200, responseTimeMs: 105, status: "success" },
  { id: "ev-11", kind: "api_call", timestamp: new Date(now - 4 * hour).toISOString(), method: "POST", endpoint: "/v1/webhooks", statusCode: 201, responseTimeMs: 78, status: "success" },
  { id: "ev-12", kind: "api_call", timestamp: new Date(now - 5 * hour).toISOString(), method: "GET", endpoint: "/v1/usage", statusCode: 200, responseTimeMs: 28, status: "success" },
  { id: "ev-13", kind: "webhook_delivery", timestamp: new Date(now - 5.5 * hour).toISOString(), webhookUrl: "https://hooks.zapier.com/...", eventType: "lead.created", statusCode: 200, responseTimeMs: 88, status: "success" },
  { id: "ev-14", kind: "api_call", timestamp: new Date(now - 6 * hour).toISOString(), method: "GET", endpoint: "/v1/calls", statusCode: 401, responseTimeMs: 5, status: "failed" },
  { id: "ev-15", kind: "api_call", timestamp: new Date(now - 7 * hour).toISOString(), method: "POST", endpoint: "/v1/leads", statusCode: 201, responseTimeMs: 92, status: "success" },
];
