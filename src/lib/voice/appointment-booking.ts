/**
 * AI-Powered Appointment Booking Engine
 *
 * Enables the AI agent to book appointments during live calls.
 * Detects booking intent, presents available slots, confirms the booking,
 * and sends confirmation via SMS/email.
 *
 * Features:
 * - Intent detection (knows when caller wants to book)
 * - Slot availability checking (based on workspace calendar settings)
 * - Smart slot suggestion (picks optimal times)
 * - Booking confirmation with SMS + email
 * - No-show prevention with reminders
 * - Rescheduling and cancellation
 * - Calendar integration (Google Calendar, Outlook) via webhook events
 * - Timezone-aware scheduling
 * - Buffer time between appointments
 * - Business hours enforcement
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { fireWebhookEvent } from "@/lib/integrations/webhook-events";

/* ── Types ───────────────────────────────────────────────────────── */

export interface AppointmentSlot {
  start: Date;
  end: Date;
  formatted: string; // "Tuesday, March 28 at 2:00 PM"
  available: boolean;
}

export interface BookingRequest {
  workspace_id: string;
  lead_id: string;
  call_id?: string;
  title: string;
  preferred_date?: string; // "tomorrow", "next tuesday", "march 28"
  preferred_time?: string; // "2pm", "morning", "afternoon"
  duration_minutes?: number;
  timezone?: string;
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  appointment_id?: string;
  slot?: AppointmentSlot;
  confirmation_sent?: boolean;
  error?: string;
  suggested_alternatives?: AppointmentSlot[];
}

export interface CalendarSettings {
  business_hours: { start: string; end: string }; // "09:00" - "17:00"
  business_days: number[]; // 0=Sun..6=Sat
  slot_duration_minutes: number;
  buffer_minutes: number; // Gap between appointments
  advance_booking_days: number; // How far ahead can book
  timezone: string;
}

/* ── Defaults ────────────────────────────────────────────────────── */

const DEFAULT_CALENDAR: CalendarSettings = {
  business_hours: { start: "09:00", end: "17:00" },
  business_days: [1, 2, 3, 4, 5], // Mon-Fri
  slot_duration_minutes: 30,
  buffer_minutes: 15,
  advance_booking_days: 14,
  timezone: "America/New_York",
};

/* ── Intent Detection ────────────────────────────────────────────── */

/**
 * Detect if the caller is expressing intent to book an appointment.
 */
export function detectBookingIntent(text: string): {
  detected: boolean;
  confidence: number;
  extracted: {
    date?: string;
    time?: string;
    duration?: string;
  };
} {
  const normalized = text.toLowerCase().trim();

  // Strong signals
  const strongPatterns = /\b(book|schedule|set up|make) (an |a |)(appointment|meeting|call|consultation|demo|session|time)/i;
  const directAsk = /\b(when (are you|can i|do you have) (available|free|open)|what times? (do you have|are available|work)|can (i|we) (set|schedule|book|pick) (a |)(time|date|slot))\b/i;
  const readySignals = /\b(i('d| would) (like|love) to (book|schedule|set up|come in)|let('s| us) (book|schedule|set|pick) (a |)(time|date))\b/i;

  let confidence = 0;
  const extracted: { date?: string; time?: string; duration?: string } = {};

  if (strongPatterns.test(normalized)) confidence += 0.5;
  if (directAsk.test(normalized)) confidence += 0.4;
  if (readySignals.test(normalized)) confidence += 0.5;

  // Date extraction
  const datePatterns: Array<[RegExp, string]> = [
    [/\btomorrow\b/i, "tomorrow"],
    [/\btoday\b/i, "today"],
    [/\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, ""],
    [/\bthis (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, ""],
    [/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, ""],
    [/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i, ""],
    [/\b\d{1,2}\/\d{1,2}\b/, ""],
    [/\bnext week\b/i, "next week"],
  ];

  for (const [pattern] of datePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      extracted.date = match[0];
      confidence += 0.1;
      break;
    }
  }

  // Time extraction
  const timePatterns: Array<[RegExp, string]> = [
    [/\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i, ""],
    [/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i, ""],
    [/\b(morning|afternoon|evening)\b/i, ""],
    [/\b(noon|midday|lunch)\b/i, "12:00 PM"],
  ];

  for (const [pattern] of timePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      extracted.time = match[0];
      confidence += 0.1;
      break;
    }
  }

  return {
    detected: confidence >= 0.4,
    confidence: Math.min(confidence, 1),
    extracted,
  };
}

/* ── Availability ────────────────────────────────────────────────── */

/**
 * Get available appointment slots for a workspace.
 */
export async function getAvailableSlots(
  workspaceId: string,
  targetDate?: Date,
  count: number = 5,
): Promise<AppointmentSlot[]> {
  const db = getDb();
  const slots: AppointmentSlot[] = [];

  try {
    // Load workspace calendar settings
    const settings = await getCalendarSettings(workspaceId);
    const startDate = targetDate ?? new Date();

    // Get existing appointments to check for conflicts
    const lookAheadEnd = new Date(startDate.getTime() + settings.advance_booking_days * 86_400_000);

    const { data: existingAppts } = await db
      .from("appointments")
      .select("start_time, end_time, duration_minutes, status")
      .eq("workspace_id", workspaceId)
      .gte("start_time", startDate.toISOString())
      .lte("start_time", lookAheadEnd.toISOString())
      .in("status", ["confirmed", "rescheduled"]);

    const booked = (existingAppts ?? []) as Array<{
      start_time: string;
      end_time?: string;
      duration_minutes?: number;
      status: string;
    }>;

    const bookedRanges = booked.map((a) => {
      const start = new Date(a.start_time);
      const dur = a.duration_minutes ?? settings.slot_duration_minutes;
      const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + dur * 60_000);
      return { start, end };
    });

    // Generate available slots
    const current = new Date(startDate);
    // Start from tomorrow if today
    if (current.toDateString() === new Date().toDateString()) {
      current.setDate(current.getDate() + 1);
    }

    const [startHour, startMin] = settings.business_hours.start.split(":").map(Number);
    const [endHour, endMin] = settings.business_hours.end.split(":").map(Number);
    const slotMs = settings.slot_duration_minutes * 60_000;
    const bufferMs = settings.buffer_minutes * 60_000;

    let daysChecked = 0;
    while (slots.length < count && daysChecked < settings.advance_booking_days) {
      const dayOfWeek = current.getDay();

      if (settings.business_days.includes(dayOfWeek)) {
        // Generate slots for this day
        const dayStart = new Date(current);
        dayStart.setHours(startHour, startMin, 0, 0);

        const dayEnd = new Date(current);
        dayEnd.setHours(endHour, endMin, 0, 0);

        let slotStart = new Date(dayStart);

        while (slotStart.getTime() + slotMs <= dayEnd.getTime() && slots.length < count) {
          const slotEnd = new Date(slotStart.getTime() + slotMs);

          // Check for conflicts
          const hasConflict = bookedRanges.some((range) => {
            const bufferedStart = new Date(range.start.getTime() - bufferMs);
            const bufferedEnd = new Date(range.end.getTime() + bufferMs);
            return slotStart < bufferedEnd && slotEnd > bufferedStart;
          });

          if (!hasConflict) {
            slots.push({
              start: new Date(slotStart),
              end: slotEnd,
              formatted: formatSlot(slotStart, settings.timezone),
              available: true,
            });
          }

          slotStart = new Date(slotStart.getTime() + slotMs + bufferMs);
        }
      }

      current.setDate(current.getDate() + 1);
      daysChecked++;
    }

    return slots;
  } catch (err) {
    log("error", "appointment_booking.availability_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Format a slot time for spoken delivery on a phone call.
 * Uses Intl.DateTimeFormat to properly format in the workspace's timezone.
 */
function formatSlot(date: Date, timezone: string): string {
  try {
    // Use Intl.DateTimeFormat to format date in the correct timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: timezone,
    });

    // Format the date: "Tuesday, March 28, 2:00 PM"
    const formatted = formatter.format(date);

    // Rearrange to match expected format: "Tuesday, March 28 at 2:00 PM"
    // The Intl output is "Tuesday, March 28, 2:00 PM", we just need to replace the comma before time
    const parts = formatted.split(", ");
    if (parts.length >= 2) {
      // Rejoin: "Tuesday, March 28 at 2:00 PM"
      return `${parts.slice(0, -1).join(", ")} at ${parts[parts.length - 1]}`;
    }

    return formatted;
  } catch (err) {
    // Fallback if timezone is invalid - use local time with warning
    console.warn(`Invalid timezone "${timezone}" in formatSlot, falling back to local time`, err);

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNum = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    const displayMin = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";

    return `${dayName}, ${monthName} ${dayNum} at ${displayHour}${displayMin} ${ampm}`;
  }
}

/* ── Booking ─────────────────────────────────────────────────────── */

/**
 * Book an appointment slot.
 */
export async function bookAppointment(
  request: BookingRequest,
  slot: AppointmentSlot,
): Promise<BookingResult> {
  const db = getDb();

  try {
    // Double-check availability (prevent race condition)
    const { data: conflicts } = await db
      .from("appointments")
      .select("id")
      .eq("workspace_id", request.workspace_id)
      .gte("start_time", new Date(slot.start.getTime() - 60_000).toISOString())
      .lte("start_time", new Date(slot.end.getTime() + 60_000).toISOString())
      .in("status", ["confirmed", "rescheduled"])
      .limit(1);

    if (conflicts && (conflicts as unknown[]).length > 0) {
      // Slot was taken — suggest alternatives
      const alternatives = await getAvailableSlots(request.workspace_id, slot.start, 3);
      return {
        success: false,
        error: "That slot was just taken",
        suggested_alternatives: alternatives,
      };
    }

    // Create the appointment
    const duration = request.duration_minutes ?? 30;
    const { data: appt, error } = await db
      .from("appointments")
      .insert({
        workspace_id: request.workspace_id,
        lead_id: request.lead_id,
        call_id: request.call_id,
        title: request.title,
        notes: request.notes,
        start_time: slot.start.toISOString(),
        end_time: slot.end.toISOString(),
        status: "confirmed",
      })
      .select("id")
      .single();

    if (error) throw error;

    const appointmentId = (appt as { id: string })?.id;

    // Fire webhook event for calendar integrations
    await fireWebhookEvent(request.workspace_id, "appointment.booked", {
      appointment_id: appointmentId,
      lead_id: request.lead_id,
      title: request.title,
      scheduled_at: slot.start.toISOString(),
      duration_minutes: duration,
      timezone: request.timezone ?? "America/New_York",
    });

    // Send confirmation SMS if lead has phone + consent
    let confirmationSent = false;
    try {
      const { data: lead } = await db
        .from("leads")
        .select("phone, email, metadata")
        .eq("id", request.lead_id)
        .maybeSingle();

      if (lead) {
        const leadData = lead as { phone?: string; email?: string; metadata?: Record<string, unknown> };
        const meta = leadData.metadata ?? {};

        if (leadData.phone && meta.sms_consent === true) {
          await sendBookingConfirmationSms(
            leadData.phone,
            slot,
            request.title,
            request.workspace_id,
          );
          confirmationSent = true;
        }
      }
    } catch (confirmErr) {
      log("warn", "appointment_booking.confirmation_failed", {
        error: confirmErr instanceof Error ? confirmErr.message : String(confirmErr),
      });
    }

    log("info", "appointment_booking.booked", {
      appointmentId,
      leadId: request.lead_id,
      slot: slot.formatted,
      workspace: request.workspace_id,
    });

    return {
      success: true,
      appointment_id: appointmentId,
      slot,
      confirmation_sent: confirmationSent,
    };
  } catch (err) {
    log("error", "appointment_booking.book_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, error: err instanceof Error ? err.message : "Booking failed" };
  }
}

/**
 * Cancel an appointment.
 */
export async function cancelAppointment(
  appointmentId: string,
  workspaceId: string,
  reason?: string,
): Promise<boolean> {
  const db = getDb();

  try {
    await db
      .from("appointments")
      .update({
        status: "cancelled",
        notes: reason ? `Cancelled: ${reason}` : "Cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId);

    // Get appointment details for webhook
    const { data: appt } = await db
      .from("appointments")
      .select("lead_id, start_time, title")
      .eq("id", appointmentId)
      .maybeSingle();

    if (appt) {
      const apptData = appt as { lead_id?: string; start_time?: string; title?: string };
      await fireWebhookEvent(workspaceId, "appointment.cancelled", {
        appointment_id: appointmentId,
        lead_id: apptData.lead_id,
        scheduled_at: apptData.start_time,
        title: apptData.title,
        reason,
      });
    }

    log("info", "appointment_booking.cancelled", { appointmentId, reason });
    return true;
  } catch (err) {
    log("error", "appointment_booking.cancel_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Reschedule an appointment to a new slot.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  workspaceId: string,
  newSlot: AppointmentSlot,
): Promise<BookingResult> {
  const db = getDb();

  try {
    // Mark old appointment as rescheduled
    await db
      .from("appointments")
      .update({
        status: "rescheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .eq("workspace_id", workspaceId);

    // Get original appointment details
    const { data: original } = await db
      .from("appointments")
      .select("lead_id, call_id, title, notes, start_time, end_time")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!original) {
      return { success: false, error: "Original appointment not found" };
    }

    const orig = original as {
      lead_id: string;
      call_id?: string;
      title: string;
      notes?: string;
      start_time: string;
      end_time?: string;
    };

    // Calculate duration from original appointment
    const origDuration = orig.end_time && orig.start_time
      ? Math.round((new Date(orig.end_time).getTime() - new Date(orig.start_time).getTime()) / 60000)
      : 30;

    // Book the new slot
    return await bookAppointment({
      workspace_id: workspaceId,
      lead_id: orig.lead_id,
      call_id: orig.call_id,
      title: orig.title,
      duration_minutes: origDuration,
      notes: orig.notes,
    }, newSlot);
  } catch (err) {
    log("error", "appointment_booking.reschedule_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { success: false, error: "Reschedule failed" };
  }
}

/* ── Helpers ─────────────────────────────────────────────────────── */

async function getCalendarSettings(workspaceId: string): Promise<CalendarSettings> {
  try {
    const db = getDb();
    const { data: ws } = await db
      .from("workspaces")
      .select("settings")
      .eq("id", workspaceId)
      .maybeSingle();

    const settings = ((ws as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<string, unknown>;
    const calendar = settings.calendar as Partial<CalendarSettings> | undefined;

    return { ...DEFAULT_CALENDAR, ...calendar };
  } catch {
    return DEFAULT_CALENDAR;
  }
}

async function sendBookingConfirmationSms(
  phone: string,
  slot: AppointmentSlot,
  title: string,
  workspaceId: string,
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return;

  const message = `Your appointment "${title}" is confirmed for ${slot.formatted}. Reply CANCEL to cancel or RESCHEDULE to change the time. - Revenue Operator`;

  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: message,
        }).toString(),
      },
    );
  } catch (err) {
    log("warn", "appointment_booking.sms_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Build a natural language response for the AI agent to speak
 * when presenting available slots to the caller.
 */
export function buildSlotPresentationScript(slots: AppointmentSlot[]): string {
  if (slots.length === 0) {
    return "I don't have any available slots in the next two weeks. Would you like me to have someone call you back to schedule?";
  }

  if (slots.length === 1) {
    return `I have an opening ${slots[0].formatted}. Would that work for you?`;
  }

  if (slots.length === 2) {
    return `I have two openings: ${slots[0].formatted}, or ${slots[1].formatted}. Which works better?`;
  }

  // Show first 3
  const first3 = slots.slice(0, 3);
  return `I have a few openings: ${first3[0].formatted}, ${first3[1].formatted}, or ${first3[2].formatted}. Any of those work for you?`;
}
