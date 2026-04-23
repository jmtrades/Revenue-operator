/**
 * Workspace email: config (Resend/SendGrid), templates with variable interpolation, send queue with delivery tracking (Task 23).
 */

import { getDb } from "@/lib/db/queries";
// Phase 13a — short-circuit sends against the per-workspace suppression list.
import {
  createSupabaseSuppressionWriter,
  isEmailSuppressed,
} from "@/lib/integrations/email-suppression";
// Phase 79 Task 13.1 — Circuit breaker around Resend to fail fast during
// provider outages instead of burning retry quota.
import {
  resendBreaker,
  runThroughBreaker,
} from "@/lib/reliability/provider-breakers";

export type EmailProvider = "resend" | "sendgrid";

export interface WorkspaceEmailConfig {
  workspace_id: string;
  provider: EmailProvider;
  from_email: string;
  from_name: string | null;
  has_api_key: boolean;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
}

export interface TemplateVars {
  "contact.name"?: string;
  "contact.email"?: string;
  "contact.phone"?: string;
  "appointment.date"?: string;
  "appointment.time"?: string;
  "appointment.title"?: string;
  "agent.name"?: string;
  [key: string]: string | undefined;
}

const DEFAULT_TEMPLATE_SLUGS = [
  "appointment_confirmation",
  "appointment_reminder",
  "follow_up_after_call",
  "missed_call_notification",
  "campaign_summary",
] as const;

/** Replace {{variable}} in text with vars. Supports contact.name, appointment.date, agent.name, etc. */
export function renderTemplate(text: string, vars: TemplateVars): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    if (value == null) continue;
    const placeholder = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "gi");
    out = out.replace(placeholder, value);
  }
  return out;
}

export async function getWorkspaceEmailConfig(workspaceId: string): Promise<WorkspaceEmailConfig | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_email_config")
    .select("workspace_id, provider, from_email, from_name, provider_config")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  const r = data as { workspace_id: string; provider: string; from_email: string; from_name?: string | null; provider_config?: { api_key?: string } | null };
  return {
    workspace_id: r.workspace_id,
    provider: r.provider as EmailProvider,
    from_email: r.from_email,
    from_name: r.from_name ?? null,
    has_api_key: Boolean(r.provider_config?.api_key),
  };
}

/** Get API key for sending: workspace config or env RESEND_API_KEY. */
async function getSendApiKey(workspaceId: string): Promise<{ key: string; from: string; fromName: string } | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_email_config")
    .select("provider, provider_config, from_email, from_name")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (data) {
    const r = data as { provider: string; provider_config?: { api_key?: string } | null; from_email: string; from_name?: string | null };
    let key: string | null = null;
    const storedKey = r.provider_config?.api_key?.trim();
    if (storedKey) {
      try {
        const { decrypt } = await import("@/lib/encryption");
        key = await decrypt(storedKey);
      } catch {
        // If decryption fails, try using the key as-is (might be plaintext)
        key = storedKey;
      }
    }
    key = key || process.env.RESEND_API_KEY?.trim() || null;
    if (key && r.provider === "resend") return { key, from: r.from_email, fromName: r.from_name?.trim() || "Revenue Operator" };
  }
  const envKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  return envKey ? { key: envKey, from, fromName: match ? match[1].trim() : "Revenue Operator" } : null;
}

export async function getTemplate(workspaceId: string, slug: string): Promise<EmailTemplate | null> {
  const db = getDb();
  const { data } = await db
    .from("email_templates")
    .select("id, slug, name, subject, html_body")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const r = data as { id: string; slug: string; name: string; subject: string; html_body: string };
  return { id: r.id, slug: r.slug, name: r.name, subject: r.subject, body_html: r.html_body };
}

export async function sendEmail(
  workspaceId: string,
  to: string,
  subject: string,
  bodyHtml: string,
  options?: { template_slug?: string }
): Promise<{ ok: boolean; id?: string; externalId?: string; error?: string }> {
  const db = getDb();

  // Phase 13a — never send to a suppressed address. This protects domain
  // reputation and is mandatory for workspaces in regulated industries.
  try {
    const suppressionWriter = createSupabaseSuppressionWriter(db);
    const { suppressed, reason } = await isEmailSuppressed(workspaceId, to, suppressionWriter);
    if (suppressed) {
      return { ok: false, error: `suppressed:${reason ?? "unknown"}` };
    }
  } catch {
    // Suppression table may not exist yet in some environments — fail open but
    // log. This is additive; the DB migration gates the hard guarantee.
  }

  const creds = await getSendApiKey(workspaceId);
  if (!creds) {
    console.warn("[email] RESEND_API_KEY not configured — email not sent");
    return { ok: false, error: "email_not_configured" };
  }

  const from = creds.from.includes("<") ? creds.from : `${creds.fromName} <${creds.from}>`;

  const { data: inserted } = await db
    .from("email_send_queue")
    .insert({
      workspace_id: workspaceId,
      to_email: to,
      subject,
      body_html: bodyHtml,
      status: "pending",
      template_slug: options?.template_slug ?? null,
    })
    .select("id")
    .maybeSingle();
  const queueId = (inserted as { id: string } | null)?.id;
  if (!queueId) return { ok: false, error: "Failed to create queue entry" };

  // Phase 79 Task 13.1 — Route the Resend HTTP call through the provider
  // breaker. runThroughBreaker returns `{error: "circuit_open:resend-email"}`
  // when the breaker is tripped, letting the caller short-circuit without
  // touching Resend.
  const breakerResult = await runThroughBreaker(resendBreaker, async () => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.key}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: bodyHtml,
      }),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (res.ok && json.id) {
      return { id: json.id };
    }
    return {
      error:
        (json as { message?: string }).message ?? res.statusText ?? "Send failed",
    };
  });

  if ("error" in breakerResult) {
    await db
      .from("email_send_queue")
      .update({ status: "failed", error_message: breakerResult.error })
      .eq("id", queueId);
    return { ok: false, id: queueId, error: breakerResult.error };
  }

  await db
    .from("email_send_queue")
    .update({ status: "sent", external_id: breakerResult.id, sent_at: new Date().toISOString() })
    .eq("id", queueId);
  return { ok: true, id: queueId, externalId: breakerResult.id };
}

export const DEFAULT_EMAIL_TEMPLATE_SLUGS = DEFAULT_TEMPLATE_SLUGS;
