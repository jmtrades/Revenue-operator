/**
 * Admin analytics route: signup funnel, feature adoption, retention cohorts, DAU/WAU/MAU.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const result: Record<string, unknown> = {};

  // Signup funnel: homepage_visit → signup_start → signup_complete → onboarding_start → onboarding_complete → first_call → activated
  try {
    const funnel_events = ["homepage_visit", "signup_start", "signup_complete", "onboarding_start", "onboarding_complete", "first_call"];
    const funnel_data: Record<string, number> = {};

    for (const event of funnel_events) {
      const { count } = await db.from("page_events").select("id", { count: "exact", head: true }).eq("event_name", event);
      funnel_data[event] = count ?? 0;
    }

    const { count: activatedCount } = await db.from("activation_events").select("id", { count: "exact", head: true });
    funnel_data.activated = activatedCount ?? 0;

    result.signup_funnel = funnel_data;
  } catch (err) {
    result.signup_funnel = { error: "Failed to fetch signup funnel" };
  }

  // Feature adoption rates from feature_usage
  try {
    const { data: features } = await db.from("feature_usage").select("feature_name, created_at").order("created_at", { ascending: false });
    // Group by feature_name and count
    const featureCounts: Record<string, number> = {};
    (features ?? []).forEach((f: { feature_name: string }) => {
      featureCounts[f.feature_name] = (featureCounts[f.feature_name] || 0) + 1;
    });
    result.feature_adoption = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, usage_count: count }))
      .sort((a, b) => b.usage_count - a.usage_count);
  } catch (err) {
    result.feature_adoption = [];
  }

  // Retention cohorts: users grouped by signup week, with activity in subsequent weeks
  try {
    const { data: users } = await db.from("users").select("id, created_at").order("created_at", { ascending: true });
    const cohorts: Record<string, { signups: number; week_1_active: number; week_2_active: number; week_4_active: number }> = {};

    if (users && users.length > 0) {
      // Group users by signup week
      users.forEach((u: { created_at: string }) => {
        const createdDate = new Date(u.created_at);
        const weekKey = `${createdDate.getFullYear()}-W${Math.ceil(createdDate.getDate() / 7)}`;
        if (!cohorts[weekKey]) {
          cohorts[weekKey] = { signups: 0, week_1_active: 0, week_2_active: 0, week_4_active: 0 };
        }
        cohorts[weekKey].signups += 1;
      });

      // For now, assume we don't have detailed activity tracking, so return the structure
      result.retention_cohorts = cohorts;
    } else {
      result.retention_cohorts = {};
    }
  } catch (err) {
    result.retention_cohorts = { error: "Failed to fetch retention cohorts" };
  }

  // DAU/WAU/MAU from page_events
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayIso = todayStart.toISOString();
    const weekAgoIso = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgoIso = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, todayStart.getDate()).toISOString();

    const { count: dau_count } = await db.from("page_events").select("session_id", { count: "exact", head: true }).gte("created_at", todayIso);
    const { count: wau_count } = await db.from("page_events").select("session_id", { count: "exact", head: true }).gte("created_at", weekAgoIso);
    const { count: mau_count } = await db.from("page_events").select("session_id", { count: "exact", head: true }).gte("created_at", monthAgoIso);

    result.usage_metrics = {
      dau: dau_count ?? 0,
      wau: wau_count ?? 0,
      mau: mau_count ?? 0,
    };
  } catch (err) {
    result.usage_metrics = { error: "Failed to fetch usage metrics" };
  }

  // Top features used
  try {
    const { data: allFeatures } = await db.from("feature_usage").select("feature_name, created_at");
    // Group by feature_name and count
    const featureCounts: Record<string, number> = {};
    (allFeatures ?? []).forEach((f: { feature_name: string }) => {
      featureCounts[f.feature_name] = (featureCounts[f.feature_name] || 0) + 1;
    });
    result.top_features = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (err) {
    result.top_features = [];
  }

  return NextResponse.json(result);
}
