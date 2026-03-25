/**
 * Passive Revenue Signal Engine
 * Analyzes last 30 days of real data to detect revenue leakage patterns.
 * Returns counts only - no probabilities, no confidence, no AI wording.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const workspaceId = session.workspaceId;
  const db = getDb();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Get all leads and messages for this workspace
    const { data: leads } = await db
      .from("leads")
      .select("id, created_at")
      .eq("workspace_id", workspaceId);

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        conversations_likely_quiet: 0,
        follow_ups_missed: 0,
        calls_unconfirmed: 0,
        quiet_time_sensitivity: null,
        missed_time_sensitivity: null,
        unconfirmed_time_sensitivity: null,
        has_data: false,
      });
    }

    const leadIds = leads.map((l) => l.id);

    // Get all messages
    const { data: messages } = await db
      .from("messages")
      .select("id, lead_id, created_at, direction, content")
      .in("lead_id", leadIds)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // Get all calendar sessions
    const { data: sessions } = await db
      .from("calendar_sessions")
      .select("id, lead_id, call_started_at, confirmed_at")
      .in("lead_id", leadIds)
      .gte("call_started_at", thirtyDaysAgo.toISOString());

    // Analyze signals with time sensitivity
    const quietSignals: Array<{ timestamp: string }> = [];
    const missedSignals: Array<{ timestamp: string }> = [];
    const unconfirmedSignals: Array<{ timestamp: string }> = [];

    // Group messages by lead
    const messagesByLead = new Map<string, typeof messages>();
    (messages || []).forEach((msg) => {
      if (!messagesByLead.has(msg.lead_id)) {
        messagesByLead.set(msg.lead_id, []);
      }
      messagesByLead.get(msg.lead_id)!.push(msg);
    });

    // Helper to get time sensitivity label
    const getTimeSensitivity = (timestamp: string): string => {
      const now = Date.now();
      const signalTime = new Date(timestamp).getTime();
      const hoursAgo = (now - signalTime) / (1000 * 60 * 60);
      const daysAgo = hoursAgo / 24;
      
      if (daysAgo < 1) return "Today";
      if (daysAgo < 2) return "Yesterday";
      return "A few days ago";
    };

    // Check each lead for signals
    for (const lead of leads) {
      const leadMessages = messagesByLead.get(lead.id) || [];
      if (leadMessages.length === 0) continue;

      // Signal 1: Inbound messages without reply
      const inboundMessages = leadMessages.filter((m) => m.direction === "inbound");
      const outboundMessages = leadMessages.filter((m) => m.direction === "outbound");
      
      if (inboundMessages.length > 0) {
        const lastInbound = inboundMessages[inboundMessages.length - 1];
        const repliesAfter = outboundMessages.filter(
          (m) => new Date(m.created_at) > new Date(lastInbound.created_at)
        );
        if (repliesAfter.length === 0) {
          const hoursSince = (Date.now() - new Date(lastInbound.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursSince > 24) {
            quietSignals.push({ timestamp: lastInbound.created_at });
          }
        }
      }

      // Signal 2: Reply delays > 24h
      for (let i = 0; i < inboundMessages.length; i++) {
        const inbound = inboundMessages[i];
        const nextOutbound = outboundMessages.find(
          (m) => new Date(m.created_at) > new Date(inbound.created_at)
        );
        if (nextOutbound) {
          const delayHours = (new Date(nextOutbound.created_at).getTime() - new Date(inbound.created_at).getTime()) / (1000 * 60 * 60);
          if (delayHours > 24) {
            missedSignals.push({ timestamp: inbound.created_at });
            break; // Count once per lead
          }
        }
      }

      // Signal 3: Conversations ending in question from lead
      if (inboundMessages.length > 0) {
        const lastMessage = leadMessages[leadMessages.length - 1];
        if (lastMessage.direction === "inbound" && lastMessage.content && /[?]/.test(lastMessage.content)) {
          const hoursSince = (Date.now() - new Date(lastMessage.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursSince > 24 && outboundMessages.length === 0) {
            quietSignals.push({ timestamp: lastMessage.created_at });
          }
        }
      }

      // Signal 4: Booked calls without confirmation message
      const leadSessions = (sessions || []).filter((s) => s.lead_id === lead.id);
      for (const session of leadSessions) {
        if (!session.confirmed_at && session.call_started_at) {
          const callTime = new Date(session.call_started_at);
          const now = new Date();
          // Check if call is in future and no confirmation message exists
          if (callTime > now) {
            const hoursUntilCall = (callTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            // If call is within 48 hours and no confirmation
            if (hoursUntilCall < 48 && hoursUntilCall > 0) {
              const callTimeMs = callTime.getTime();
              const fortyEightHoursAgo = callTimeMs - 48 * 60 * 60 * 1000;
              const hasConfirmationMessage = leadMessages.some(
                (m) =>
                  m.direction === "outbound" &&
                  m.content &&
                  (/confirm/i.test(m.content) || /attending/i.test(m.content)) &&
                  new Date(m.created_at).getTime() > fortyEightHoursAgo
              );
              if (!hasConfirmationMessage) {
                unconfirmedSignals.push({ timestamp: session.call_started_at });
              }
            }
          }
        }
      }
    }

    // Get most recent timestamp for each signal type (for time sensitivity display)
    const getMostRecentTime = (signals: Array<{ timestamp: string }>): string | null => {
      if (signals.length === 0) return null;
      return signals.reduce((latest, signal) => 
        new Date(signal.timestamp) > new Date(latest) ? signal.timestamp : latest,
        signals[0]!.timestamp
      );
    };

    return NextResponse.json({
      conversations_likely_quiet: quietSignals.length,
      follow_ups_missed: missedSignals.length,
      calls_unconfirmed: unconfirmedSignals.length,
      quiet_time_sensitivity: getMostRecentTime(quietSignals) ? getTimeSensitivity(getMostRecentTime(quietSignals)!) : null,
      missed_time_sensitivity: getMostRecentTime(missedSignals) ? getTimeSensitivity(getMostRecentTime(missedSignals)!) : null,
      unconfirmed_time_sensitivity: getMostRecentTime(unconfirmedSignals) ? getTimeSensitivity(getMostRecentTime(unconfirmedSignals)!) : null,
      has_data: true,
    });
  } catch (error) {
    // Error response returned below
    return NextResponse.json({
      conversations_likely_quiet: 0,
      follow_ups_missed: 0,
      calls_unconfirmed: 0,
      quiet_time_sensitivity: null,
      missed_time_sensitivity: null,
      unconfirmed_time_sensitivity: null,
      has_data: false,
    });
  }
}
