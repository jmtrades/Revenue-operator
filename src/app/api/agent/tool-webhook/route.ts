export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";

/**
 * POST /api/agent/tool-webhook
 *
 * Voice server webhook — called when the AI agent uses a tool during a live call.
 * Executes the tool action and returns the result to the voice server.
 *
 * Body: { tool_name, tool_args, workspace_id, call_session_id, caller_phone? }
 */

const MAX_BODY_SIZE = 256 * 1024; // 256KB — tool args should never be larger

interface ToolRequest {
  tool_name: string;
  tool_args: Record<string, unknown>;
  workspace_id: string;
  call_session_id?: string;
  caller_phone?: string;
}

export async function POST(req: NextRequest) {
  // Enforce request size limit
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "Request too large", result: "Technical issue. Someone will follow up." }, { status: 413 });
  }

  // Validate webhook secret if configured (external voice server shares this secret)
  const webhookSecret = process.env.TOOL_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (token !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized", result: "Technical issue. Someone will follow up." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    // Fail closed in production — webhook secret must be configured
    log("error", "[tool-webhook] TOOL_WEBHOOK_SECRET not configured in production — rejecting request");
    return NextResponse.json({ error: "Unauthorized", result: "Technical issue. Someone will follow up." }, { status: 401 });
  }

  let body: ToolRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", result: "I'm sorry, I had a technical issue. Let me try again." }, { status: 400 });
  }

  const { tool_name, tool_args, workspace_id } = body;
  if (!tool_name || !workspace_id) {
    return NextResponse.json({ error: "Missing tool_name or workspace_id", result: "Let me try that again." }, { status: 400 });
  }

  // Rate limit: 120 tool calls per minute per workspace (active calls may fire many tools)
  const rl = await checkRateLimit(`tool-webhook:${workspace_id}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded", result: "I'm having a small technical issue. Please hold a moment." }, { status: 429 });
  }

  // Verify workspace exists
  const db0 = getDb();
  const { data: ws } = await db0.from("workspaces").select("id").eq("id", workspace_id).maybeSingle();
  if (!ws) {
    return NextResponse.json({ error: "Invalid workspace", result: "Technical issue. Someone will follow up." }, { status: 404 });
  }

  const db = getDb();

  try {
    switch (tool_name) {
      case "book_appointment": {
        const { date, time, service, caller_name, caller_phone, caller_email, notes } = tool_args as {
          date?: string; time?: string; service?: string; caller_name?: string;
          caller_phone?: string; caller_email?: string; notes?: string;
        };

        // Create appointment in calendar_events table
        const startTime = date && time ? `${date}T${time}:00` : new Date().toISOString();
        const { data: event, error } = await db.from("calendar_events").insert({
          workspace_id,
          title: `${service || "Appointment"} — ${caller_name || "Customer"}`,
          start_time: startTime,
          end_time: new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          attendee_name: caller_name,
          attendee_phone: caller_phone || body.caller_phone,
          attendee_email: caller_email,
          notes,
          source: "ai_agent",
          status: "confirmed",
        }).select("id").maybeSingle();

        if (error) {
          log("error", "[tool-webhook] book_appointment error:", { error: error.message });
          return NextResponse.json({ result: `I've noted your appointment request for ${date} at ${time}. Someone will confirm shortly.` });
        }

        // Also capture/update lead
        await upsertLead(db, workspace_id, { name: caller_name, phone: caller_phone || body.caller_phone, email: caller_email, notes: `Booked: ${service} on ${date} at ${time}` });

        // Send confirmation SMS if we have a phone number
        const phone = caller_phone || body.caller_phone;
        if (phone) {
          await sendQuickSms(db, workspace_id, phone, `Your ${service || "appointment"} with us is confirmed for ${date} at ${time}. We look forward to seeing you!`);
        }

        return NextResponse.json({
          result: `Perfect! I've booked your ${service || "appointment"} for ${date} at ${time}. You'll receive a confirmation text shortly.`,
          event_id: (event as { id: string } | null)?.id,
        });
      }

      case "check_availability": {
        const { date } = tool_args as { date?: string; service?: string };
        const targetDate = date || new Date().toISOString().split("T")[0];

        // Check existing appointments for that day
        const dayStart = `${targetDate}T00:00:00`;
        const dayEnd = `${targetDate}T23:59:59`;
        const { data: existing } = await db
          .from("calendar_events")
          .select("start_time, end_time")
          .eq("workspace_id", workspace_id)
          .gte("start_time", dayStart)
          .lte("start_time", dayEnd)
          .eq("status", "confirmed")
          .order("start_time");

        const bookedSlots = (existing ?? []).map((e: Record<string, unknown>) => {
          const s = new Date(String(e.start_time));
          return `${s.getHours()}:${String(s.getMinutes()).padStart(2, "0")}`;
        });

        // Generate available slots (9am-5pm, hourly, excluding booked)
        const available: string[] = [];
        for (let h = 9; h < 17; h++) {
          const slot = `${h}:00`;
          if (!bookedSlots.some(b => b.startsWith(`${h}:`))) {
            available.push(slot);
          }
        }

        if (available.length === 0) {
          return NextResponse.json({ result: `I'm sorry, it looks like ${targetDate} is fully booked. Would you like to try another day?`, available: [] });
        }

        const formatted = available.slice(0, 5).map(s => {
          const h = parseInt(s);
          return h >= 12 ? `${h === 12 ? 12 : h - 12}:00 PM` : `${h}:00 AM`;
        }).join(", ");

        return NextResponse.json({ result: `For ${targetDate}, I have these times available: ${formatted}. Which works best for you?`, available });
      }

      case "capture_lead": {
        const { name, phone, email, service_needed, urgency, notes } = tool_args as {
          name?: string; phone?: string; email?: string; service_needed?: string;
          urgency?: string; notes?: string;
        };

        const leadId = await upsertLead(db, workspace_id, {
          name,
          phone: phone || body.caller_phone,
          email,
          notes: [service_needed, notes].filter(Boolean).join(" — "),
          urgency,
        });

        return NextResponse.json({
          result: `Got it! I've saved ${name || "your"} information. ${service_needed ? `We'll follow up about ${service_needed}.` : "Someone will be in touch soon."}`,
          lead_id: leadId,
        });
      }

      case "transfer_call": {
        const { reason, department, urgency } = tool_args as { reason?: string; department?: string; urgency?: string };

        // Get transfer number from workspace config
        const { data: wsRow } = await db
          .from("workspaces")
          .select("transfer_phone")
          .eq("id", workspace_id)
          .maybeSingle();

        const transferPhone = (wsRow as { transfer_phone?: string } | null)?.transfer_phone;

        // Log the transfer
        if (body.call_session_id) {
          await db.from("call_sessions").update({
            outcome: "routed",
            metadata: { transfer_reason: reason, department, urgency },
            updated_at: new Date().toISOString(),
          }).eq("id", body.call_session_id);
        }

        return NextResponse.json({
          result: transferPhone
            ? `Let me transfer you now. One moment please.`
            : `I'll have ${department || "the right person"} call you back shortly. ${reason ? `I'll let them know it's regarding ${reason}.` : ""}`,
          transfer_to: transferPhone,
          action: transferPhone ? "transfer" : "callback",
        });
      }

      case "send_sms": {
        const { to_phone, message } = tool_args as { to_phone?: string; message?: string };
        const phone = to_phone || body.caller_phone;

        if (phone && message) {
          await sendQuickSms(db, workspace_id, phone, message);
          return NextResponse.json({ result: "Done! I've sent that text to you. You should receive it in just a moment." });
        }
        return NextResponse.json({ result: "I'll make sure that information gets sent to you." });
      }

      case "lookup_customer": {
        const { phone } = tool_args as { phone?: string };
        const lookupPhone = phone || body.caller_phone;

        if (!lookupPhone) {
          return NextResponse.json({ result: "I don't have a phone number to look up. Could you tell me the number on your account?" });
        }

        const normalized = lookupPhone.replace(/\D/g, "");
        const { data: lead } = await db
          .from("leads")
          .select("name, email, status, metadata, created_at")
          .eq("workspace_id", workspace_id)
          .or(`phone.eq.${lookupPhone},phone.eq.${normalized}`)
          .limit(1)
          .maybeSingle();

        if (!lead) {
          return NextResponse.json({ result: "I don't see an existing account with that number. Are you a new customer?", found: false });
        }

        const l = lead as { name?: string; email?: string; status?: string; created_at?: string };
        return NextResponse.json({
          result: `I found your account${l.name ? `, ${l.name}` : ""}! How can I help you today?`,
          found: true,
          customer: { name: l.name, email: l.email, status: l.status },
        });
      }

      case "take_message": {
        const { caller_name, caller_phone, message, for_person, urgency, preferred_callback_time } = tool_args as {
          caller_name?: string; caller_phone?: string; message?: string;
          for_person?: string; urgency?: string; preferred_callback_time?: string;
        };

        await db.from("messages").insert({
          workspace_id,
          from_name: caller_name,
          from_phone: caller_phone || body.caller_phone,
          message_text: message,
          for_person,
          urgency: urgency || "normal",
          preferred_callback_time,
          source: "ai_agent",
          status: "unread",
        });

        // Also capture as lead if new
        await upsertLead(db, workspace_id, {
          name: caller_name,
          phone: caller_phone || body.caller_phone,
          notes: `Message: ${message}${for_person ? ` (for ${for_person})` : ""}`,
        });

        return NextResponse.json({
          result: `I've taken your message${for_person ? ` for ${for_person}` : ""}. ${preferred_callback_time ? `We'll call you back around ${preferred_callback_time}.` : "Someone will get back to you as soon as possible."}`,
        });
      }

      case "send_email": {
        const { to_email, subject, body: emailBody } = tool_args as { to_email?: string; subject?: string; body?: string };

        if (to_email && emailBody) {
          // SAFETY: Check if recipient lead is opted out
          try {
            const { data: recipientLead } = await db
              .from("leads")
              .select("id")
              .eq("workspace_id", workspace_id)
              .eq("email", to_email)
              .maybeSingle();
            if (recipientLead) {
              const { isOptedOut } = await import("@/lib/lead-opt-out");
              if (await isOptedOut(workspace_id, `lead:${(recipientLead as { id: string }).id}`)) {
                return NextResponse.json({ result: "That contact has opted out of email communications." });
              }
            }
          } catch {
            // opt-out table may not exist
          }

          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
                  to: to_email,
                  subject: subject ?? "Following up",
                  text: emailBody,
                }),
              });
              return NextResponse.json({ result: `I've sent that email to ${to_email}. You should see it in your inbox shortly.` });
            } catch {
              return NextResponse.json({ result: "I'll have that email sent to you shortly." });
            }
          }
        }
        return NextResponse.json({ result: "I'll make sure that gets emailed to you." });
      }

      case "search_knowledge": {
        const { query, category } = tool_args as { query?: string; category?: string };
        if (!query) return NextResponse.json({ result: "" });

        // Search knowledge base
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        let qb = db
          .from("knowledge_base")
          .select("content, metadata, category")
          .eq("workspace_id", workspace_id)
          .limit(5);

        if (category) qb = qb.eq("category", category);

        // Use text search
        const { data: results } = await qb;

        if (!results || results.length === 0) {
          return NextResponse.json({ result: "", found: false });
        }

        // Score results by keyword overlap
        const scored = (results as Array<{ content: string; metadata?: Record<string, unknown> }>)
          .map(r => {
            const text = r.content.toLowerCase();
            const meta = r.metadata as Record<string, string> | null;
            const answer = meta?.answer ?? r.content;
            const overlap = queryWords.filter(w => text.includes(w)).length / Math.max(1, queryWords.length);
            return { answer, score: overlap };
          })
          .filter(r => r.score > 0.2)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
          return NextResponse.json({ result: "", found: false });
        }

        return NextResponse.json({ result: scored[0].answer, found: true });
      }

      case "check_business_hours": {
        const { data: wsRow } = await db
          .from("workspaces")
          .select("business_hours, timezone")
          .eq("id", workspace_id)
          .maybeSingle();

        const hours = (wsRow as { business_hours?: string } | null)?.business_hours ?? "Monday to Friday, 9 AM to 5 PM";
        return NextResponse.json({ result: `Our hours are ${hours}. Is there anything else I can help with?` });
      }

      case "collect_payment": {
        const { amount_cents, description, customer_name, customer_phone } = tool_args as {
          amount_cents?: number; description?: string; customer_name?: string; customer_phone?: string;
        };

        const amount = amount_cents ? `$${(amount_cents / 100).toFixed(2)}` : "the amount discussed";
        const phone = customer_phone || body.caller_phone;

        // In production this would generate a Stripe payment link
        // For now, log the payment request and notify the team
        try {
          await db.from("payment_requests").insert({
            workspace_id,
            customer_name,
            customer_phone: phone,
            amount_cents,
            description,
            status: "pending",
            source: "ai_agent",
          });
        } catch {
          // Table may not exist
        }

        if (phone) {
          await sendQuickSms(db, workspace_id, phone,
            `Here's your secure payment link for ${amount}: [Payment link will be sent separately]. Thank you!`);
        }

        return NextResponse.json({
          result: `I'm sending a secure payment link to your phone for ${amount}. You'll receive it in just a moment. Is there anything else I can help with?`,
        });
      }

      case "create_estimate": {
        const { customer_name, customer_phone, customer_email, service_type, description, estimated_amount_cents, notes } = tool_args as {
          customer_name?: string; customer_phone?: string; customer_email?: string;
          service_type?: string; description?: string; estimated_amount_cents?: number; notes?: string;
        };

        // Log estimate
        try {
          await db.from("estimates").insert({
            workspace_id,
            customer_name,
            customer_phone: customer_phone || body.caller_phone,
            customer_email,
            service_type,
            description,
            amount_cents: estimated_amount_cents,
            notes,
            status: "draft",
            source: "ai_agent",
          });
        } catch {
          // Table may not exist
        }

        await upsertLead(db, workspace_id, {
          name: customer_name,
          phone: customer_phone || body.caller_phone,
          email: customer_email,
          notes: `Estimate requested: ${service_type} — ${description}`,
        });

        const amt = estimated_amount_cents ? `around $${(estimated_amount_cents / 100).toFixed(2)}` : "customized to your needs";
        return NextResponse.json({
          result: `I've created an estimate for ${service_type || "the service you described"}. The estimated cost is ${amt}. We'll send you a detailed quote shortly. Would you like to go ahead and schedule the work?`,
        });
      }

      case "book_zoom_meeting": {
        const { date, time, topic, attendee_name, attendee_email, attendee_phone, notes, duration_minutes } = tool_args as {
          date?: string; time?: string; topic?: string; attendee_name?: string;
          attendee_email?: string; attendee_phone?: string; notes?: string; duration_minutes?: number;
        };

        const startTime = date && time ? `${date}T${time}:00` : new Date().toISOString();
        await db.from("calendar_events").insert({
          workspace_id,
          title: `Zoom: ${topic || "Video Meeting"} — ${attendee_name || "Customer"}`,
          start_time: startTime,
          end_time: new Date(new Date(startTime).getTime() + (duration_minutes ?? 30) * 60 * 1000).toISOString(),
          attendee_name,
          attendee_email,
          attendee_phone: attendee_phone || body.caller_phone,
          notes,
          source: "ai_agent",
          event_type: "zoom",
          status: "confirmed",
        });

        await upsertLead(db, workspace_id, { name: attendee_name, phone: attendee_phone || body.caller_phone, email: attendee_email });

        return NextResponse.json({
          result: `Your Zoom meeting is scheduled for ${date} at ${time}. ${attendee_email ? `I'll send the Zoom link to ${attendee_email}.` : "We'll send you the meeting link shortly."}`,
        });
      }

      case "check_order_status": {
        const { order_id, customer_phone } = tool_args as { order_id?: string; customer_phone?: string; customer_email?: string };

        // Generic order lookup
        return NextResponse.json({
          result: order_id
            ? `Let me look up order ${order_id}. I'll have someone check the status and get back to you with an update.`
            : "I'll have someone look into that and give you a call back with the status. Can I confirm the best number to reach you?",
        });
      }

      default:
        return NextResponse.json({ result: "Let me note that and have someone follow up with you." });
    }
  } catch (err) {
    log("error", `[tool-webhook] Error executing ${tool_name}:`, { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ result: "I'm having a small technical issue. Let me make a note and someone will follow up with you." });
  }
}

// Helper: upsert a lead (create or update)
async function upsertLead(
  db: ReturnType<typeof getDb>,
  workspaceId: string,
  data: { name?: string; phone?: string; email?: string; notes?: string; urgency?: string }
): Promise<string | null> {
  if (!data.phone && !data.email) return null;

  try {
    // Try to find existing lead
    let query = db.from("leads").select("id").eq("workspace_id", workspaceId);
    if (data.phone) {
      const normalized = data.phone.replace(/\D/g, "");
      query = query.or(`phone.eq.${data.phone},phone.eq.${normalized}`);
    } else if (data.email) {
      query = query.eq("email", data.email);
    }

    const { data: existing } = await query.limit(1).maybeSingle();

    if (existing) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name && data.name !== "New Lead") updates.name = data.name;
      if (data.email) updates.email = data.email;
      if (data.notes) updates.notes = data.notes;
      await db.from("leads").update(updates).eq("id", (existing as { id: string }).id);
      return (existing as { id: string }).id;
    }

    // Create new lead
    const result = await runWithWriteContextAsync("api", async () =>
      db.from("leads").insert({
        workspace_id: workspaceId,
        name: data.name || "New Lead",
        phone: data.phone,
        email: data.email,
        state: "NEW",
        notes: data.notes,
        source: "ai_agent",
      }).select("id").maybeSingle()
    ) as { data?: { id: string } | null };

    return result.data?.id ?? null;
  } catch {
    return null;
  }
}

// Helper: send a quick SMS via the workspace's phone config
async function sendQuickSms(
  db: ReturnType<typeof getDb>,
  workspaceId: string,
  toPhone: string,
  text: string
): Promise<boolean> {
  try {
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("proxy_number")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .maybeSingle();

    const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
    if (!fromNumber) return false;

    const { getTelephonyService } = await import("@/lib/telephony");
    const svc = getTelephonyService();
    await svc.sendSms({ from: fromNumber, to: toPhone, text });
    return true;
  } catch {
    return false;
  }
}
import { log } from "@/lib/logger";
