/**
 * POST /api/integrations/webhooks/[provider] — Inbound CRM webhook receiver (Task 19).
 * Verifies request using provider-specific HMAC signatures where available,
 * falls back to shared secret. Resolves workspace, enqueues inbound sync.
 * Payload shape is provider-specific; this route enqueues and returns 200 so the provider does not retry.
 */

import { NextRequest, NextResponse } from "next/server";
import { enqueueSync } from "@/lib/integrations/sync-engine";
import { SUPPORTED_CRM_PROVIDERS, type CrmProviderId } from "@/lib/crm/providers";
import crypto from "crypto";

/**
 * Phase 78 Task 9.3: providers that can push inbound webhooks. This is a
 * semantic *subset* of `SUPPORTED_CRM_PROVIDERS` — it deliberately excludes
 * providers that don't ship a webhook channel (airtable, google_sheets, etc.)
 * The subset is validated at load time against the base set so a typo here
 * can't drift past tsc.
 */
const WEBHOOK_CAPABLE_PROVIDERS = [
  "salesforce",
  "hubspot",
  "zoho_crm",
  "pipedrive",
  "gohighlevel",
  "google_contacts",
  "microsoft_365",
] as const satisfies readonly CrmProviderId[];

// Runtime self-check: every webhook-capable provider MUST be in the canonical
// supported list. Catches drift if a provider id is removed upstream.
for (const p of WEBHOOK_CAPABLE_PROVIDERS) {
  if (!(SUPPORTED_CRM_PROVIDERS as readonly string[]).includes(p)) {
    throw new Error(
      `[crm/providers] webhooks route declares '${p}' but it is not in SUPPORTED_CRM_PROVIDERS`
    );
  }
}

const ALLOWED: readonly CrmProviderId[] = WEBHOOK_CAPABLE_PROVIDERS;

export const dynamic = "force-dynamic";

function isAllowed(s: string): s is CrmProviderId {
  return (ALLOWED as readonly string[]).includes(s);
}

/* ---------- Provider-Specific Signature Verification ---------- */

/**
 * HubSpot v3 signature verification.
 * Header: X-HubSpot-Signature-v3
 * Algorithm: HMAC-SHA256(clientSecret, method + url + body + timestamp)
 * Also checks X-HubSpot-Request-Timestamp is within 5 minutes.
 * @see https://developers.hubspot.com/docs/api/webhooks#security
 */
function verifyHubSpotSignature(
  req: NextRequest,
  rawBody: string
): { valid: boolean; error?: string } {
  const secret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!secret) return { valid: true }; // Skip if not configured

  const signatureHeader = req.headers.get("x-hubspot-signature-v3");
  const timestampHeader = req.headers.get("x-hubspot-request-timestamp");

  if (!signatureHeader || !timestampHeader) {
    return { valid: false, error: "Missing HubSpot signature headers" };
  }

  // Reject if timestamp is older than 5 minutes (300,000ms)
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp) || Math.abs(Date.now() - timestamp) > 300_000) {
    return { valid: false, error: "HubSpot request timestamp too old" };
  }

  const url = req.url;
  const sourceString = `POST${url}${rawBody}${timestampHeader}`;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(sourceString)
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader))) {
    return { valid: false, error: "HubSpot signature mismatch" };
  }

  return { valid: true };
}

/**
 * Salesforce webhook signature verification.
 * Header: X-Salesforce-Signature (webhook secret HMAC-SHA256 of body)
 * @see https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/using_streaming_api_stateless.htm
 */
function verifySalesforceSignature(
  req: NextRequest,
  rawBody: string
): { valid: boolean; error?: string } {
  const secret = process.env.SALESFORCE_WEBHOOK_SECRET;
  if (!secret) return { valid: true }; // Skip if not configured

  const signatureHeader = req.headers.get("x-salesforce-signature");
  if (!signatureHeader) {
    return { valid: false, error: "Missing Salesforce signature header" };
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader))) {
    return { valid: false, error: "Salesforce signature mismatch" };
  }

  return { valid: true };
}

/**
 * Zoho CRM webhook verification.
 * Header: X-Zoho-Webhook-Signature (HMAC-SHA256 of body with webhook secret)
 */
function verifyZohoSignature(
  req: NextRequest,
  rawBody: string
): { valid: boolean; error?: string } {
  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) return { valid: true };

  const signatureHeader = req.headers.get("x-zoho-webhook-signature");
  if (!signatureHeader) {
    return { valid: false, error: "Missing Zoho signature header" };
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader))) {
    return { valid: false, error: "Zoho signature mismatch" };
  }

  return { valid: true };
}

/**
 * Pipedrive webhook verification.
 * Header: X-Pipedrive-Signature (HMAC-SHA256 of body, base64-encoded)
 */
function verifyPipedriveSignature(
  req: NextRequest,
  rawBody: string
): { valid: boolean; error?: string } {
  const secret = process.env.PIPEDRIVE_WEBHOOK_SECRET;
  if (!secret) return { valid: true };

  const signatureHeader = req.headers.get("x-pipedrive-signature");
  if (!signatureHeader) {
    return { valid: false, error: "Missing Pipedrive signature header" };
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader))) {
    return { valid: false, error: "Pipedrive signature mismatch" };
  }

  return { valid: true };
}

/**
 * GoHighLevel webhook verification.
 * Header: X-GHL-Signature (HMAC-SHA256 of body)
 */
function verifyGoHighLevelSignature(
  req: NextRequest,
  rawBody: string
): { valid: boolean; error?: string } {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return { valid: true };

  const signatureHeader = req.headers.get("x-ghl-signature");
  if (!signatureHeader) {
    return { valid: false, error: "Missing GoHighLevel signature header" };
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader))) {
    return { valid: false, error: "GoHighLevel signature mismatch" };
  }

  return { valid: true };
}

/**
 * Verify webhook signature based on provider.
 * Provider-specific verification takes precedence; generic secret is fallback.
 */
function verifyProviderSignature(
  provider: CrmProviderId,
  req: NextRequest,
  rawBody: string
): { valid: boolean; error?: string } {
  switch (provider) {
    case "hubspot":
      return verifyHubSpotSignature(req, rawBody);
    case "salesforce":
      return verifySalesforceSignature(req, rawBody);
    case "zoho_crm":
      return verifyZohoSignature(req, rawBody);
    case "pipedrive":
      return verifyPipedriveSignature(req, rawBody);
    case "gohighlevel":
      return verifyGoHighLevelSignature(req, rawBody);
    default:
      // google_contacts and microsoft_365 use generic secret
      return { valid: true };
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  // No CSRF check — this endpoint receives external webhooks from CRM providers.
  // Security is enforced via provider-specific HMAC signature verification.

  const { provider } = await ctx.params;
  if (!isAllowed(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // Read raw body for both JSON parsing and HMAC verification
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Provider-specific HMAC verification first
  const sigResult = verifyProviderSignature(provider, req, rawBody);
  if (!sigResult.valid) {
    return NextResponse.json(
      { error: sigResult.error || "Invalid webhook signature" },
      { status: 401 }
    );
  }

  // Fallback: verify generic webhook secret (for providers without HMAC or as second layer)
  const genericSecret = process.env.CRM_WEBHOOK_SECRET;
  if (genericSecret) {
    const header =
      req.headers.get("x-crm-webhook-secret") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    // Only enforce generic secret if provider-specific verification was skipped (returned valid: true without configured secret)
    const providerHasOwnVerification =
      (provider === "hubspot" && !!process.env.HUBSPOT_CLIENT_SECRET) ||
      (provider === "salesforce" && !!process.env.SALESFORCE_WEBHOOK_SECRET) ||
      (provider === "zoho_crm" && !!process.env.ZOHO_WEBHOOK_SECRET) ||
      (provider === "pipedrive" && !!process.env.PIPEDRIVE_WEBHOOK_SECRET) ||
      (provider === "gohighlevel" && !!process.env.GHL_WEBHOOK_SECRET);

    if (!providerHasOwnVerification && header !== genericSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    workspace_id?: string;
    entity_type?: string;
    entity_id?: string;
    [key: string]: unknown;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId =
    typeof body.workspace_id === "string" ? body.workspace_id.trim() : null;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id required" },
      { status: 400 }
    );
  }

  const entityType = (body.entity_type ?? "contact") as string;
  const entityId =
    typeof body.entity_id === "string" ? body.entity_id : undefined;

  await enqueueSync({
    workspaceId,
    provider,
    direction: "inbound",
    entityType: entityType === "lead" ? "lead" : "contact",
    entityId: entityId ?? null,
    payload: body,
  });

  return NextResponse.json({ ok: true });
}
