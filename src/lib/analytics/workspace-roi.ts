/**
 * Workspace ROI Calculator — Cost-of-Leaving Metrics
 *
 * Calculates the tangible business value the platform has delivered,
 * making it crystal clear what a workspace would lose by cancelling.
 *
 * Metrics shown:
 * 1. Revenue recovered (calls answered that would have been missed)
 * 2. Appointments booked (that wouldn't exist without automation)
 * 3. Time saved (hours of manual work replaced)
 * 4. Lead intelligence value (data and insights accumulated)
 * 5. Integration complexity (cost to rebuild elsewhere)
 * 6. Net ROI (value delivered vs subscription cost)
 */

import { getDb } from "@/lib/db/queries";

export interface WorkspaceROI {
  workspace_id: string;
  period_days: number;

  // Revenue impact
  revenue_recovered_cents: number;
  revenue_at_risk_cents: number;        // What they'd lose by leaving
  avg_monthly_recovery_cents: number;

  // Operational value
  total_calls_handled: number;
  total_appointments_booked: number;
  total_leads_managed: number;
  total_sms_sent: number;
  total_sequences_completed: number;

  // Time savings
  estimated_hours_saved: number;
  hourly_rate_assumption_cents: number; // Default $35/hr
  time_value_cents: number;

  // Data gravity
  months_of_data: number;
  active_integrations: number;
  active_automations: number;
  custom_configurations: number;

  // Switching cost estimate
  estimated_migration_hours: number;
  estimated_migration_cost_cents: number;
  data_loss_risk: "low" | "medium" | "high";

  // Net ROI
  total_value_delivered_cents: number;
  subscription_cost_cents: number;
  net_roi_percentage: number;

  computed_at: string;
}

// Time estimates per operation (minutes saved vs manual)
const MINUTES_SAVED_PER = {
  call_handled: 8,         // Answering + logging + follow-up
  appointment_booked: 15,  // Scheduling + reminders + confirmation
  lead_scored: 5,          // Manual lead qualification
  sms_sent: 3,             // Writing + sending + logging
  sequence_step: 10,       // Manual follow-up cadence management
};

const DEFAULT_HOURLY_RATE_CENTS = 3500; // $35/hr

/**
 * Calculate comprehensive ROI for a workspace.
 */
export async function calculateWorkspaceROI(
  workspaceId: string,
  periodDays = 90
): Promise<WorkspaceROI> {
  const db = getDb();
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // Parallel data fetches
  const [
    callsRes,
    appointmentsRes,
    leadsRes,
    smsRes,
    sequencesRes,
    integrationsRes,
    automationsRes,
    workspaceRes,
    revenueRes,
  ] = await Promise.all([
    // Total calls handled
    db.from("call_sessions").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", since)
      .not("call_ended_at", "is", null),

    // Appointments booked
    db.from("appointments").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", since),

    // Leads managed
    db.from("leads").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),

    // SMS sent (from sms_delivery_log or sms_messages)
    db.from("sms_messages").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", since),

    // Sequences completed
    db.from("sequence_enrollments").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .gte("created_at", since),

    // Active CRM integrations
    db.from("workspace_crm_connections").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),

    // Active sequences (automations)
    db.from("sequences").select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),

    // Workspace billing info
    db.from("workspaces").select("billing_tier, created_at, billing_status")
      .eq("id", workspaceId)
      .maybeSingle(),

    // Revenue recovered (from deals won)
    db.from("deals").select("value_cents")
      .eq("workspace_id", workspaceId)
      .eq("status", "closed_won")
      .gte("created_at", since),
  ]);

  const totalCalls = callsRes.count ?? 0;
  const totalAppointments = appointmentsRes.count ?? 0;
  const totalLeads = leadsRes.count ?? 0;
  const totalSms = smsRes.count ?? 0;
  const totalSequences = sequencesRes.count ?? 0;
  const activeIntegrations = integrationsRes.count ?? 0;
  const activeAutomations = automationsRes.count ?? 0;

  // Revenue recovered
  const deals = (revenueRes.data ?? []) as Array<{ value_cents?: number }>;
  const revenueRecoveredCents = deals.reduce((sum, d) => sum + (d.value_cents ?? 0), 0);

  // Calculate months of data
  const ws = workspaceRes.data as { billing_tier?: string; created_at?: string } | null;
  const createdAt = ws?.created_at ? new Date(ws.created_at) : new Date();
  const monthsOfData = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)));

  // Time savings calculation
  const minutesSaved =
    totalCalls * MINUTES_SAVED_PER.call_handled +
    totalAppointments * MINUTES_SAVED_PER.appointment_booked +
    totalSms * MINUTES_SAVED_PER.sms_sent +
    totalSequences * MINUTES_SAVED_PER.sequence_step;

  const hoursSaved = Math.round(minutesSaved / 60);
  const timeValueCents = Math.round(hoursSaved * DEFAULT_HOURLY_RATE_CENTS);

  // Switching cost estimate
  const customConfigurations = activeIntegrations + activeAutomations + (totalLeads > 100 ? 1 : 0);
  const migrationHours = 40 + // Base: account setup, onboarding
    activeIntegrations * 16 +  // Each CRM integration: ~2 days
    activeAutomations * 8 +    // Each automation: ~1 day
    Math.min(80, totalLeads * 0.01); // Data migration: 1 min per 100 leads, max 80h
  const migrationCostCents = Math.round(migrationHours * 15000); // $150/hr consulting rate

  // Data loss risk
  const dataLossRisk: "low" | "medium" | "high" =
    monthsOfData >= 6 ? "high" :
    monthsOfData >= 3 ? "medium" : "low";

  // Revenue at risk (annualized monthly recovery)
  const avgMonthlyRecoveryCents = periodDays > 0
    ? Math.round(revenueRecoveredCents / (periodDays / 30))
    : 0;
  const revenueAtRiskCents = avgMonthlyRecoveryCents * 12; // Annual projection

  // Subscription cost estimate (from plan)
  const planPrices: Record<string, number> = {
    solo: 14700,      // $147/mo
    business: 50000,  // $500/mo
    scale: 150000,    // $1,500/mo
    enterprise: 300000,
  };
  const tier = (ws?.billing_tier ?? "solo").toLowerCase();
  const monthlyCostCents = planPrices[tier] ?? 14700;
  const subscriptionCostCents = Math.round(monthlyCostCents * (periodDays / 30));

  // Total value delivered
  const totalValueDeliveredCents = revenueRecoveredCents + timeValueCents;

  // Net ROI
  const netRoiPercentage = subscriptionCostCents > 0
    ? Math.round(((totalValueDeliveredCents - subscriptionCostCents) / subscriptionCostCents) * 100)
    : 0;

  return {
    workspace_id: workspaceId,
    period_days: periodDays,
    revenue_recovered_cents: revenueRecoveredCents,
    revenue_at_risk_cents: revenueAtRiskCents,
    avg_monthly_recovery_cents: avgMonthlyRecoveryCents,
    total_calls_handled: totalCalls,
    total_appointments_booked: totalAppointments,
    total_leads_managed: totalLeads,
    total_sms_sent: totalSms,
    total_sequences_completed: totalSequences,
    estimated_hours_saved: hoursSaved,
    hourly_rate_assumption_cents: DEFAULT_HOURLY_RATE_CENTS,
    time_value_cents: timeValueCents,
    months_of_data: monthsOfData,
    active_integrations: activeIntegrations,
    active_automations: activeAutomations,
    custom_configurations: customConfigurations,
    estimated_migration_hours: Math.round(migrationHours),
    estimated_migration_cost_cents: migrationCostCents,
    data_loss_risk: dataLossRisk,
    total_value_delivered_cents: totalValueDeliveredCents,
    subscription_cost_cents: subscriptionCostCents,
    net_roi_percentage: netRoiPercentage,
    computed_at: now,
  };
}
