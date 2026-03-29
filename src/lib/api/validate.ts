import { z, ZodSchema } from "zod";
import { NextResponse } from "next/server";

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 422 }) };
  }
  return { data: result.data };
}

// Common schemas
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number (E.164 format)");
export const emailSchema = z.string().email("Invalid email address").max(320);
export const workspaceIdSchema = z.string().uuid("Invalid workspace ID");
export const uuidSchema = z.string().uuid("Invalid UUID");
export const safeStringSchema = (maxLen = 500) => z.string().max(maxLen).trim();
export const safeUrlSchema = z.string().url("Invalid URL").max(2048);
export const safeStringArraySchema = (maxItems = 50, maxItemLen = 500) =>
  z.array(z.string().max(maxItemLen).trim()).max(maxItems);

// Campaign-specific
export const dialerModeSchema = z.enum(["power", "preview", "progressive"]);
export const campaignStatusSchema = z.enum(["draft", "active", "paused", "completed", "cancelled"]);

// Webhook events whitelist
export const webhookEventSchema = z.enum([
  "*", "call.started", "call.completed", "call.missed", "call.voicemail",
  "message.sent", "message.received", "message.failed",
  "contact.created", "contact.updated",
  "appointment.booked", "appointment.cancelled", "appointment.rescheduled",
  "campaign.started", "campaign.completed", "campaign.paused",
  "lead.qualified", "lead.converted",
  "payment.received", "invoice.sent",
]);

// DNC reason whitelist
export const dncReasonSchema = z.enum(["manual", "requested", "regulatory", "invalid", "duplicate", "other"]);

// Policy approval modes
export const approvalModeSchema = z.enum(["auto", "manual", "hybrid"]);
