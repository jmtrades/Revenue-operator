/**
 * POST /api/voice/check-business-hours — Called by the voice server when the
 * AI agent uses the `check_business_hours` tool during a live call.
 *
 * Returns whether the business is currently open, today's hours,
 * and the next time they open if currently closed.
 *
 * Security: Verifies voice webhook secret in Authorization header.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { createHmac, timingSafeEqual } from "crypto";

function verifyWebhookSecret(body: string, authHeader: string | null): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    if (isProduction) {
      log("error", "voice_check_hours.secret_not_configured", { message: "rejecting webhook — VOICE_WEBHOOK_SECRET must be set in production" });
      return false;
    }
    log("warn", "voice_check_hours.secret_not_configured", { message: "skipping signature verification in development" });
    return true;
  }

  if (!authHeader) {
    log("error", "voice_check_hours.missing_auth_header", { message: "Authorization header required" });
    return false;
  }

  // Expected format: "Bearer <signature>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    log("error", "voice_check_hours.invalid_auth_format", { message: "Invalid Authorization header format" });
    return false;
  }
  const signature = parts[1];

  const expected = createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("hex");

  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(signature, "utf-8"));
  } catch {
    return expected === signature;
  }
}

interface CheckHoursBody {
  workspace_id: string;
  day?: string; // "today", "tomorrow", "Monday", "Saturday", etc.
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_ALIASES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function resolveDay(input: string | undefined): { dayIndex: number; dayName: string } {
  const now = new Date();
  const todayIndex = now.getDay();

  if (!input || input.toLowerCase() === "today") {
    return { dayIndex: todayIndex, dayName: DAY_NAMES[todayIndex] };
  }

  const lower = input.toLowerCase().trim();

  if (lower === "tomorrow") {
    const tomorrowIndex = (todayIndex + 1) % 7;
    return { dayIndex: tomorrowIndex, dayName: DAY_NAMES[tomorrowIndex] };
  }

  const aliasIndex = DAY_ALIASES[lower];
  if (aliasIndex !== undefined) {
    return { dayIndex: aliasIndex, dayName: DAY_NAMES[aliasIndex] };
  }

  // Default to today if unrecognized
  return { dayIndex: todayIndex, dayName: DAY_NAMES[todayIndex] };
}

function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function isCurrentlyOpen(
  hours: { start: string; end: string },
): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = hours.start.split(":").map(Number);
  const [endH, endM] = hours.end.split(":").map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export async function POST(req: NextRequest) {
  // Verify webhook signature
  const body = await req.text();
  const authHeader = req.headers.get("Authorization");

  if (!verifyWebhookSecret(body, authHeader)) {
    log("error", "voice_check_hours.invalid_signature", { message: "signature verification failed" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CheckHoursBody;
  try {
    payload = JSON.parse(body) as CheckHoursBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, day } = payload;

  if (!workspace_id) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 },
    );
  }

  const db = getDb();

  try {
    const { data: workspace } = await db
      .from("workspaces")
      .select("business_hours, timezone")
      .eq("id", workspace_id)
      .maybeSingle();

    if (!workspace) {
      return NextResponse.json({
        ok: true,
        is_open: null,
        message: "Business hours have not been configured yet. Let me take your information and have someone get back to you.",
        hours_today: null,
      });
    }

    const ws = workspace as {
      business_hours?: Record<string, { start: string; end: string } | null> | null;
      timezone?: string | null;
    };

    const businessHours = ws.business_hours;

    if (!businessHours || Object.keys(businessHours).length === 0) {
      return NextResponse.json({
        ok: true,
        is_open: null,
        message: "Business hours have not been set up yet. I can take a message and have someone call you back.",
        hours_today: null,
      });
    }

    const { dayIndex, dayName } = resolveDay(day);

    // Look up hours for the requested day
    const dayHours = businessHours[dayName] ?? null;
    const isToday = dayIndex === new Date().getDay();

    if (!dayHours) {
      // Closed on this day — find next open day
      let nextOpenDay: string | null = null;
      let nextOpenHours: { start: string; end: string } | null = null;
      for (let offset = 1; offset <= 7; offset++) {
        const checkIndex = (dayIndex + offset) % 7;
        const checkName = DAY_NAMES[checkIndex];
        const h = businessHours[checkName];
        if (h) {
          nextOpenDay = checkName;
          nextOpenHours = h;
          break;
        }
      }

      const nextOpenMsg = nextOpenDay && nextOpenHours
        ? `We reopen on ${nextOpenDay.charAt(0).toUpperCase() + nextOpenDay.slice(1)} at ${formatTime12h(nextOpenHours.start)}.`
        : "";

      return NextResponse.json({
        ok: true,
        is_open: false,
        day: dayName,
        hours_today: null,
        message: `We're closed on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}s. ${nextOpenMsg}`.trim(),
        next_open_day: nextOpenDay,
        next_open_time: nextOpenHours?.start ?? null,
      });
    }

    const open = isToday ? isCurrentlyOpen(dayHours) : null;
    const hoursFormatted = `${formatTime12h(dayHours.start)} to ${formatTime12h(dayHours.end)}`;

    let message: string;
    if (isToday && open) {
      message = `Yes, we're open! Our hours today are ${hoursFormatted}.`;
    } else if (isToday && !open) {
      // Check if before or after hours
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = dayHours.start.split(":").map(Number);
      const startMinutes = startH * 60 + startM;

      if (currentMinutes < startMinutes) {
        message = `We're not open yet today. We open at ${formatTime12h(dayHours.start)}.`;
      } else {
        message = `We've closed for today. Our hours were ${hoursFormatted}. We'd be happy to help you tomorrow!`;
      }
    } else {
      message = `Our hours on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} are ${hoursFormatted}.`;
    }

    // Build full week hours for context
    const weekHours: Record<string, string> = {};
    for (const d of DAY_NAMES) {
      const h = businessHours[d];
      weekHours[d] = h ? `${formatTime12h(h.start)} - ${formatTime12h(h.end)}` : "Closed";
    }

    log("info", "voice.check_business_hours", {
      workspace_id,
      day: dayName,
      is_open: open,
    });

    return NextResponse.json({
      ok: true,
      is_open: open,
      day: dayName,
      hours_today: hoursFormatted,
      message,
      week_hours: weekHours,
    });
  } catch (err) {
    log("error", "voice.check_business_hours_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to check business hours" },
      { status: 500 },
    );
  }
}
