// Server-side event tracking for Revenue Operator
// Directly inserts into Supabase

import { getDb } from "@/lib/db/queries";

export async function trackServerEvent(params: {
  event_name: string;
  event_category?: string;
  user_id?: string;
  workspace_id?: string;
  properties?: Record<string, unknown>;
}) {
  try {
    const db = getDb();
    await db.from("page_events").insert({
      event_name: params.event_name,
      event_category: params.event_category || "server",
      user_id: params.user_id || null,
      workspace_id: params.workspace_id || null,
      properties: params.properties || {},
    });
  } catch (err) {
    console.error("[tracking] server event failed:", err);
  }
}

export const trackServerSignup = (userId: string, email: string) =>
  trackServerEvent({ event_name: "signup_complete", event_category: "funnel", user_id: userId, properties: { email } });

export const trackServerCallStart = (workspaceId: string, direction: string) =>
  trackServerEvent({ event_name: "call_start", event_category: "call", workspace_id: workspaceId, properties: { direction } });

export const trackServerCallEnd = (workspaceId: string, duration: number, outcome: string) =>
  trackServerEvent({ event_name: "call_end", event_category: "call", workspace_id: workspaceId, properties: { duration, outcome } });

export const trackServerPayment = (workspaceId: string, amount: number, plan: string) =>
  trackServerEvent({ event_name: "payment", event_category: "revenue", workspace_id: workspaceId, properties: { amount, plan } });

export const trackServerChurnRisk = (workspaceId: string, signal: string) =>
  trackServerEvent({ event_name: "churn_risk", event_category: "retention", workspace_id: workspaceId, properties: { signal } });
