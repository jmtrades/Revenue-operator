/**
 * Brain: function-calling layer for real-time availability, booking link, and commitment intent.
 * Used by RecallAgent so the LLM never hallucinates slots or links.
 */

export interface AvailabilitySlot {
  start: string;
  end: string;
  label?: string;
}

export interface BrainConfig {
  workspaceId: string;
  leadId?: string | null;
}

export interface CheckAvailabilityResult {
  ok: boolean;
  slots?: AvailabilitySlot[];
  message?: string;
}

export interface GetBookingLinkResult {
  ok: boolean;
  url?: string | null;
  message?: string;
}

export interface RecordCommitmentIntentResult {
  ok: boolean;
  message?: string;
}

/**
 * Check next available slots for the workspace. Uses business_hours and optional calendar.
 * Implementations should read from workspace_business_context or calendar integration.
 */
export type CheckAvailabilityFn = (
  config: BrainConfig,
  params?: { date?: string; service?: string }
) => Promise<CheckAvailabilityResult>;

/**
 * Return booking link for the workspace. From workspace_business_context.booking_link.
 */
export type GetBookingLinkFn = (config: BrainConfig) => Promise<GetBookingLinkResult>;

/**
 * Record that the lead expressed intent to book (emits canonical signal; no direct send).
 */
export type RecordCommitmentIntentFn = (
  config: BrainConfig,
  params: { intent: string }
) => Promise<RecordCommitmentIntentResult>;

export interface BrainFunctions {
  checkAvailability: CheckAvailabilityFn;
  getBookingLink: GetBookingLinkFn;
  recordCommitmentIntent: RecordCommitmentIntentFn;
}

/**
 * Build tool definitions for the LLM (e.g. OpenAI/Vapi function calling).
 */
export function getBrainToolDefinitions(): Array<{
  name: string;
  description: string;
  parameters: { type: string; properties: Record<string, unknown> };
}> {
  return [
    {
      name: "check_availability",
      description: "Check next available appointment slots for the business. Use before offering times.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Optional ISO date (YYYY-MM-DD) to check" },
          service: { type: "string", description: "Optional service type" },
        },
      },
    },
    {
      name: "get_booking_link",
      description: "Get the booking or scheduling link for the business to share with the caller.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "record_commitment_intent",
      description: "Record that the caller expressed intent to book or commit. Use when they say they want to schedule.",
      parameters: {
        type: "object",
        properties: {
          intent: { type: "string", description: "Brief intent (e.g. book consultation, schedule callback)" },
        },
      },
    },
  ];
}

/**
 * Default Brain implementation: uses getDb() and workspace_business_context.
 * Availability is derived from business_hours (next N slots); no calendar in this stub.
 */
export async function createDefaultBrain(getDb: () => ReturnType<typeof import("@/lib/db/queries").getDb>): Promise<BrainFunctions> {
  async function checkAvailability(
    config: BrainConfig
  ): Promise<CheckAvailabilityResult> {
    try {
      const db = getDb();
      const { data } = await db
        .from("workspace_business_context")
        .select("business_hours, timezone")
        .eq("workspace_id", config.workspaceId)
        .maybeSingle();
      const ctx = data as { business_hours?: Record<string, { start: string; end: string }> } | null;
      const hours = ctx?.business_hours;
      if (!hours || typeof hours !== "object") {
        return { ok: true, slots: [], message: "No hours configured; offer to have someone call back." };
      }
      const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const now = new Date();
      const slots: AvailabilitySlot[] = [];
      for (let d = 0; d < 7 && slots.length < 5; d++) {
        const day = dayOrder[(now.getDay() - 1 + d + 7) % 7];
        const dayHours = hours[day];
        if (dayHours?.start && dayHours?.end) {
          slots.push({
            start: dayHours.start,
            end: dayHours.end,
            label: day.charAt(0).toUpperCase() + day.slice(1),
          });
        }
      }
      return { ok: true, slots };
    } catch {
      return { ok: false, message: "Availability check is temporarily unavailable; I'll have someone confirm." };
    }
  }

  async function getBookingLink(config: BrainConfig): Promise<GetBookingLinkResult> {
    try {
      const db = getDb();
      const { data } = await db
        .from("workspace_business_context")
        .select("booking_link")
        .eq("workspace_id", config.workspaceId)
        .maybeSingle();
      const ctx = data as { booking_link?: string | null } | null;
      const url = ctx?.booking_link ?? null;
      return { ok: true, url: url || undefined };
    } catch {
      return { ok: false, message: "Booking link is not available right now." };
    }
  }

  async function recordCommitmentIntent(
    config: BrainConfig,
    _params: { intent: string }
  ): Promise<RecordCommitmentIntentResult> {
    try {
      if (!config.leadId) return { ok: true };
      const db = getDb();
      await db.from("commitment_registry").insert({
        workspace_id: config.workspaceId,
        thread_id: config.leadId,
        commitment_type: "appointment",
        promised_at: new Date().toISOString(),
      });
      return { ok: true };
    } catch {
      return { ok: false, message: "Intent recorded; someone will follow up." };
    }
  }

  return {
    checkAvailability,
    getBookingLink,
    recordCommitmentIntent,
  };
}
