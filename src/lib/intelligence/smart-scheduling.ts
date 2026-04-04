/**
 * Smart Call Scheduling Engine
 * Analyzes historical call data to determine optimal call times.
 * Uses answer rate patterns by hour-of-day and day-of-week.
 */

import { getDb } from "@/lib/db/queries";

export interface OptimalCallWindow {
  day_of_week: number; // 0=Sunday, 6=Saturday
  hour_start: number; // 0-23
  hour_end: number;
  answer_rate: number; // 0-1
  sample_size: number;
  confidence: "low" | "medium" | "high";
}

export interface SmartScheduleResult {
  next_best_time: string; // ISO timestamp
  windows: OptimalCallWindow[];
  timezone: string;
  reason: string;
}

/**
 * Get the optimal next call time for a lead based on workspace call history.
 */
export async function getOptimalCallTime(
  workspaceId: string,
  leadId?: string,
  timezone?: string
): Promise<SmartScheduleResult> {
  const db = getDb();
  const tz = timezone ?? "America/New_York";

  // Default windows if not enough data
  const DEFAULT_WINDOWS: OptimalCallWindow[] = [
    { day_of_week: 1, hour_start: 10, hour_end: 11, answer_rate: 0.45, sample_size: 0, confidence: "low" },
    { day_of_week: 2, hour_start: 10, hour_end: 11, answer_rate: 0.45, sample_size: 0, confidence: "low" },
    { day_of_week: 3, hour_start: 14, hour_end: 15, answer_rate: 0.42, sample_size: 0, confidence: "low" },
    { day_of_week: 4, hour_start: 10, hour_end: 11, answer_rate: 0.44, sample_size: 0, confidence: "low" },
    { day_of_week: 5, hour_start: 9, hour_end: 10, answer_rate: 0.40, sample_size: 0, confidence: "low" },
  ];

  try {
    // Pull last 90 days of call data with timestamps and outcomes
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: calls } = await db
      .from("call_sessions")
      .select("call_started_at, duration_seconds, outcome, lead_id")
      .eq("workspace_id", workspaceId)
      .gte("call_started_at", ninetyDaysAgo)
      .not("call_started_at", "is", null)
      .limit(2000);

    if (!calls || calls.length < 20) {
      // Not enough data — use defaults
      const nextBest = getNextWindowTime(DEFAULT_WINDOWS, tz);
      return {
        next_best_time: nextBest,
        windows: DEFAULT_WINDOWS,
        timezone: tz,
        reason: "Using industry-standard optimal call times (not enough call history yet)",
      };
    }

    // Build hour-of-day × day-of-week answer rate matrix
    const matrix: Record<string, { answered: number; total: number }> = {};

    for (const call of calls as Array<{ call_started_at: string; duration_seconds?: number; outcome?: string }>) {
      if (!call.call_started_at) continue;
      const dt = new Date(call.call_started_at);
      const dow = dt.getDay();
      const hour = dt.getHours();
      const key = `${dow}-${hour}`;

      if (!matrix[key]) matrix[key] = { answered: 0, total: 0 };
      matrix[key].total++;

      // "Answered" = duration > 10s OR outcome indicates connection
      const answered = (call.duration_seconds && call.duration_seconds > 10) ||
        ["connected", "appointment_confirmed", "information_provided", "payment_made", "payment_promised"].includes(call.outcome ?? "");
      if (answered) matrix[key].answered++;
    }

    // Convert to windows, sorted by answer rate
    const windows: OptimalCallWindow[] = [];
    for (const [key, stats] of Object.entries(matrix)) {
      if (stats.total < 3) continue; // Need at least 3 calls for a data point
      const [dow, hour] = key.split("-").map(Number);
      const rate = stats.answered / stats.total;
      windows.push({
        day_of_week: dow,
        hour_start: hour,
        hour_end: hour + 1,
        answer_rate: Math.round(rate * 100) / 100,
        sample_size: stats.total,
        confidence: stats.total >= 20 ? "high" : stats.total >= 10 ? "medium" : "low",
      });
    }

    windows.sort((a, b) => b.answer_rate - a.answer_rate);

    // If lead-specific data exists, check if this lead has a preferred time
    if (leadId) {
      const { data: leadCalls } = await db
        .from("call_sessions")
        .select("call_started_at, duration_seconds")
        .eq("lead_id", leadId)
        .not("call_started_at", "is", null)
        .gt("duration_seconds", 10)
        .limit(10);

      if (leadCalls && leadCalls.length >= 2) {
        // This lead has answered before — find their preferred hours
        const leadHours = (leadCalls as Array<{ call_started_at: string }>)
          .map(c => new Date(c.call_started_at).getHours());
        const preferredHour = mode(leadHours);
        if (preferredHour !== null) {
          // Boost this hour in the windows
          const boosted = windows.find(w => w.hour_start === preferredHour);
          if (boosted) {
            boosted.answer_rate = Math.min(1, boosted.answer_rate * 1.3);
            windows.sort((a, b) => b.answer_rate - a.answer_rate);
          }
        }
      }
    }

    const topWindows = windows.length > 0 ? windows.slice(0, 10) : DEFAULT_WINDOWS;
    const nextBest = getNextWindowTime(topWindows, tz);

    return {
      next_best_time: nextBest,
      windows: topWindows,
      timezone: tz,
      reason: windows.length > 0
        ? `Based on ${calls.length} calls over the last 90 days. Best answer rate: ${Math.round(topWindows[0].answer_rate * 100)}% (${topWindows[0].confidence} confidence)`
        : "Using industry-standard optimal call times",
    };
  } catch (_err) {
    // Error in smart scheduling (error details omitted to protect PII)
    const nextBest = getNextWindowTime(DEFAULT_WINDOWS, tz);
    return {
      next_best_time: nextBest,
      windows: DEFAULT_WINDOWS,
      timezone: tz,
      reason: "Using default schedule (error loading call history)",
    };
  }
}

/** Get the next occurrence of the best call window from now. */
function getNextWindowTime(windows: OptimalCallWindow[], _tz: string): string {
  if (windows.length === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString();
  }

  const now = new Date();
  const currentDow = now.getDay();
  const currentHour = now.getHours();

  // Try to find a window today that hasn't passed yet
  for (const w of windows) {
    if (w.day_of_week === currentDow && w.hour_start > currentHour) {
      const target = new Date(now);
      target.setHours(w.hour_start, 0, 0, 0);
      return target.toISOString();
    }
  }

  // Find the next future window (could be tomorrow or later this week)
  for (let offset = 1; offset <= 7; offset++) {
    const targetDow = (currentDow + offset) % 7;
    const windowForDay = windows.find(w => w.day_of_week === targetDow);
    if (windowForDay) {
      const target = new Date(now);
      target.setDate(target.getDate() + offset);
      target.setHours(windowForDay.hour_start, 0, 0, 0);
      return target.toISOString();
    }
  }

  // Fallback: tomorrow at 10am
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return tomorrow.toISOString();
}

/** Statistical mode (most frequent value) */
function mode(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const freq: Record<number, number> = {};
  let maxFreq = 0;
  let modeVal = arr[0];
  for (const v of arr) {
    freq[v] = (freq[v] ?? 0) + 1;
    if (freq[v] > maxFreq) {
      maxFreq = freq[v];
      modeVal = v;
    }
  }
  return modeVal;
}

/**
 * API helper: Get the schedule recommendation for a specific lead.
 */
export async function getLeadCallSchedule(
  workspaceId: string,
  leadId: string,
  timezone?: string
): Promise<SmartScheduleResult> {
  return getOptimalCallTime(workspaceId, leadId, timezone);
}
