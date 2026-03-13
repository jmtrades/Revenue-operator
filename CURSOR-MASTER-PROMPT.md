You are an implementation engineer finishing business-critical infrastructure. There are 14 gaps that affect revenue, user experience, and system integrity. Fix all of them. Do not plan. Do not narrate. Open files, edit, save, move on.

---

## ITEM 1: Fix number release to cancel Twilio billing

File: `src/app/api/phone/numbers/[id]/release/route.ts`

When a number is released, the code updates the DB status to "released" but does NOT release the number from Twilio. This means Twilio keeps billing us.

After the DB update, add a Twilio API call to release the number:

```ts
// After updating status to "released" in DB
const providerSid = number.provider_sid;
if (providerSid && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers/${providerSid}.json`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
      }
    );
  } catch (e) {
    console.error("Failed to release Twilio number:", e);
    // Don't fail the user request — DB is already updated
  }
}
```

---

## ITEM 2: Expand international number support to 20+ countries

File: `src/app/api/phone/available/route.ts`

The current code hardcodes `country === "US"` (line 35). Replace the entire Twilio query section to support any country Twilio offers:

```ts
// Replace the US-only check with dynamic country support
const countryCode = (country || "US").toUpperCase();
const SUPPORTED_COUNTRIES = [
  "US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE",
  "NO", "DK", "FI", "IE", "AT", "CH", "BE", "PT", "JP", "BR",
  "MX", "IN", "SG", "HK", "NZ", "ZA", "IL", "PL", "CZ"
];

if (!SUPPORTED_COUNTRIES.includes(countryCode)) {
  return NextResponse.json({ error: "Country not supported" }, { status: 400 });
}

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const numberType = type === "toll_free" ? "TollFree" : "Local";
  const url = new URL(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/${countryCode}/${numberType}.json`
  );
  // Area code only for US/CA
  if (areaCode && (countryCode === "US" || countryCode === "CA")) {
    url.searchParams.set("AreaCode", areaCode);
  }
  if (state && countryCode === "US") {
    url.searchParams.set("InRegion", state);
  }
  // ... rest of fetch logic stays the same
}
```

Also update `src/app/api/phone/provision/route.ts`:
- Remove the hardcoded `country_code: "US"` on the DB insert
- Instead use: `country_code: body.country || "US"` (accept country from request body)
- Update the phone normalization to not assume +1 prefix for non-US numbers

Also update the marketplace UI at `src/app/app/settings/phone/marketplace/page.tsx`:
- Expand the country dropdown from [US, CA] to all 29 supported countries
- Add country names: `{ code: "GB", name: "United Kingdom" }`, `{ code: "AU", name: "Australia" }`, etc.

---

## ITEM 3: Implement number porting backend

File: Create `src/app/api/phone/port-request/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { workspaceId } = await requireWorkspaceAccess(req);
  const body = await req.json();

  const { phone_number, current_carrier, account_number, account_pin, loa_url, contact_name, contact_email } = body;

  if (!phone_number || !current_carrier) {
    return NextResponse.json({ error: "Phone number and carrier required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("port_requests")
    .insert({
      workspace_id: workspaceId,
      phone_number,
      current_carrier,
      account_number: account_number || null,
      account_pin: account_pin || null,
      loa_url: loa_url || null,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO: Send notification email to ops team
  return NextResponse.json(data);
}
```

Create migration `supabase/migrations/port_requests_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS revenue_operator.port_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id),
  phone_number text NOT NULL,
  current_carrier text NOT NULL,
  account_number text,
  account_pin text,
  loa_url text,
  contact_name text,
  contact_email text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE revenue_operator.port_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY port_requests_workspace ON revenue_operator.port_requests
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM revenue_operator.workspace_roles WHERE user_id = auth.uid()
  ));
```

Update the port page UI at `src/app/app/settings/phone/port/page.tsx` to actually POST to `/api/phone/port-request` on form submit.

---

## ITEM 4: Implement per-minute usage tracking

File: `src/app/api/usage/route.ts`

The current endpoint counts number of calls, not minutes. Replace the calls count query with actual minute tracking:

```ts
// Replace the simple count with duration sum
const { data: callData } = await supabase
  .from("call_sessions")
  .select("duration_seconds")
  .eq("workspace_id", workspaceId)
  .gte("started_at", periodStart.toISOString());

const totalMinutes = Math.ceil(
  (callData || []).reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60
);
```

Update the response to include minutes:
```ts
return NextResponse.json({
  calls: callCount,
  minutes_used: totalMinutes,
  minutes_limit: planLimits.minutes,
  minutes_pct: Math.round((totalMinutes / planLimits.minutes) * 100),
  messages: messageCount,
  messages_limit: planLimits.messages,
  messages_pct: Math.round((messageCount / planLimits.messages) * 100),
});
```

Update `PLAN_LIMITS` to use minutes instead of call counts:
```ts
const PLAN_LIMITS: Record<string, { minutes: number; messages: number }> = {
  solo: { minutes: 400, messages: 500 },
  growth: { minutes: 1500, messages: 2000 },
  team: { minutes: 5000, messages: 10000 },
  enterprise: { minutes: 50000, messages: 100000 },
};
```

---

## ITEM 5: Implement Stripe metered overage billing

File: Create `src/lib/billing/overage.ts`

```ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" });

const OVERAGE_RATES: Record<string, number> = {
  solo: 25,       // $0.25/min in cents
  growth: 18,     // $0.18/min
  team: 12,       // $0.12/min
  enterprise: 10, // $0.10/min
};

export async function reportUsageOverage(
  workspaceId: string,
  subscriptionId: string,
  tier: string,
  minutesUsed: number,
  minutesIncluded: number,
) {
  const overageMinutes = Math.max(0, minutesUsed - minutesIncluded);
  if (overageMinutes <= 0) return;

  const ratePerMin = OVERAGE_RATES[tier] || 25;
  const overageAmountCents = overageMinutes * ratePerMin;

  // Create a one-time invoice item for overage
  await stripe.invoiceItems.create({
    customer: (await stripe.subscriptions.retrieve(subscriptionId)).customer as string,
    amount: overageAmountCents,
    currency: "usd",
    description: `Voice overage: ${overageMinutes} minutes × $${(ratePerMin / 100).toFixed(2)}/min`,
    metadata: { workspace_id: workspaceId, overage_minutes: String(overageMinutes) },
  });
}
```

File: Create `src/app/api/cron/usage-overage/route.ts`

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { reportUsageOverage } from "@/lib/billing/overage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  // Run daily — checks all active workspaces for overage
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, billing_status, billing_tier, stripe_subscription_id")
    .eq("billing_status", "active");

  for (const ws of workspaces || []) {
    if (!ws.stripe_subscription_id) continue;

    // Get current period minutes
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { data: calls } = await supabase
      .from("call_sessions")
      .select("duration_seconds")
      .eq("workspace_id", ws.id)
      .gte("started_at", periodStart.toISOString());

    const totalMinutes = Math.ceil(
      (calls || []).reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60
    );

    const PLAN_MINUTES: Record<string, number> = {
      solo: 400, growth: 1500, team: 5000, enterprise: 50000,
    };
    const included = PLAN_MINUTES[ws.billing_tier] || 400;

    if (totalMinutes > included) {
      await reportUsageOverage(ws.id, ws.stripe_subscription_id, ws.billing_tier, totalMinutes, included);
    }
  }

  return NextResponse.json({ ok: true });
}
```

---

## ITEM 6: Create Twilio status webhook handler

File: Create `src/app/api/webhooks/twilio/status/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const callSid = formData.get("CallSid") as string;
  const callStatus = formData.get("CallStatus") as string;
  const callDuration = formData.get("CallDuration") as string;

  if (!callSid) {
    return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
  }

  // Update call session with final status
  await supabase
    .from("call_sessions")
    .update({
      status: callStatus === "completed" ? "completed" : callStatus,
      duration_seconds: callDuration ? parseInt(callDuration, 10) : undefined,
      ended_at: new Date().toISOString(),
    })
    .eq("external_meeting_id", callSid);

  return new Response("OK", { status: 200 });
}
```

---

## ITEM 7: Update DB provider defaults from "vapi" to "twilio"

File: `supabase/migrations/phone_numbers_table.sql`

The `phone_numbers.provider` column defaults to `'vapi'`. This is wrong now that ElevenLabs is the default voice provider. Twilio is still the telephony provider.

Create a new migration `supabase/migrations/update_provider_defaults.sql`:

```sql
-- Update provider default for new phone numbers
ALTER TABLE revenue_operator.phone_numbers ALTER COLUMN provider SET DEFAULT 'twilio';

-- Update existing vapi provider entries to twilio (they're all Twilio-purchased numbers)
UPDATE revenue_operator.phone_numbers SET provider = 'twilio' WHERE provider = 'vapi';
```

Also update `src/app/api/phone/provision/route.ts` — change `provider: "vapi"` to `provider: "twilio"` in the insert.

---

## ITEM 8: Update Twilio inbound voice webhook for ElevenLabs

File: `src/app/api/webhooks/twilio/voice/route.ts`

This route still tries to route calls through Vapi. Update it to use the voice provider abstraction:

Find any import of `createCallForTwilio` from `@/lib/vapi/client` and replace with:
```ts
import { getVoiceProvider } from "@/lib/voice";
```

Replace the Vapi call logic with:
```ts
const voice = getVoiceProvider();
const assistantId = workspace.vapi_assistant_id; // rename this column later
const twiml = await voice.createInboundCall(CallSid, assistantId);
return new Response(twiml, {
  headers: { "Content-Type": "application/xml" },
});
```

---

## ITEM 9: Auto-cleanup numbers when workspace paused/deleted

File: `src/app/api/billing/webhook/route.ts`

In the `customer.subscription.deleted` event handler, add number release logic:

```ts
// After setting billing_status to paused/trial
// Release all workspace phone numbers from Twilio to stop charges
const { data: numbers } = await supabase
  .from("phone_numbers")
  .select("id, provider_sid")
  .eq("workspace_id", workspaceId)
  .eq("status", "active");

if (numbers && numbers.length > 0 && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  for (const num of numbers) {
    if (num.provider_sid) {
      try {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers/${num.provider_sid}.json`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            },
          }
        );
      } catch (e) {
        console.error("Failed to release number:", num.provider_sid, e);
      }
    }
  }
  // Mark all as released in DB
  await supabase
    .from("phone_numbers")
    .update({ status: "released" })
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
}
```

---

## ITEM 10: Enable multi-step campaign execution (SMS + email, not just voice)

File: `src/app/api/campaigns/[id]/launch/route.ts`

Currently this only calls `executeLeadOutboundCall()`. Add support for SMS and email steps in campaign sequences:

After the existing voice call logic, add:

```ts
import { sendOutbound } from "@/lib/delivery/provider";

// If campaign has sequence steps beyond voice
if (campaign.sequence_steps && campaign.sequence_steps.length > 0) {
  for (const step of campaign.sequence_steps) {
    if (step.channel === "sms" && step.message) {
      await sendOutbound({
        workspaceId,
        leadId: lead.id,
        channel: "sms",
        content: step.message,
        to: { phone: lead.phone },
      });
    }
    if (step.channel === "email" && step.message) {
      await sendOutbound({
        workspaceId,
        leadId: lead.id,
        channel: "email",
        content: step.message,
        to: { email: lead.email },
        emailSubject: step.subject || campaign.name,
      });
    }
  }
}
```

If `sendOutbound` doesn't exist with that exact signature, adapt to use whatever the existing delivery provider exports. Check `src/lib/delivery/provider.ts` for the exact function signature.

---

## ITEM 11: Consolidate phone_numbers and phone_configs tables

File: `src/app/api/integrations/twilio/auto-provision/route.ts`

This route still writes to `phone_configs` (legacy table). Update it to write to `phone_numbers` instead:

Replace `phone_configs` inserts with `phone_numbers` inserts matching the schema:
```ts
await supabase.from("phone_numbers").insert({
  workspace_id: workspaceId,
  phone_number: purchasedNumber,
  friendly_name: friendlyName,
  country_code: "US",
  number_type: numberType,
  provider: "twilio",
  provider_sid: providerSid,
  status: "active",
  monthly_cost_cents: numberType === "toll_free" ? 200 : 150,
  capabilities: { voice: true, sms: true, mms: false },
});
```

Keep backward compatibility by also writing to `phone_configs` if it's used elsewhere, but the primary record should be in `phone_numbers`.

---

## ITEM 12: Add Twilio voice webhook signature verification

File: `src/app/api/webhooks/twilio/voice/route.ts`

The SMS inbound webhook verifies Twilio signatures but the voice webhook does NOT. Add signature verification:

```ts
import crypto from "crypto";

function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false; // Skip verification if no auth token

  const sorted = Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], "");
  const data = url + sorted;
  const expected = crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
  return expected === signature;
}
```

Add at the top of the POST handler:
```ts
const sig = req.headers.get("x-twilio-signature");
if (sig && process.env.TWILIO_AUTH_TOKEN) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice`;
  const params = Object.fromEntries(formData.entries()) as Record<string, string>;
  if (!verifyTwilioSignature(url, params, sig)) {
    return new Response("Invalid signature", { status: 403 });
  }
}
```

---

## ITEM 13: Fix billing page to show minutes instead of calls

File: `src/app/app/settings/billing/page.tsx`

The billing page likely shows "calls used" but the plan limits are in minutes. Update the usage display to show minutes:

Find where usage data is displayed (calls_pct, calls, calls_limit) and update labels:
- "Calls used" → "Minutes used"
- Show `usage.minutes_used` instead of `usage.calls`
- Show `usage.minutes_limit` instead of `usage.calls_limit`
- Show `usage.minutes_pct` for the progress bar

---

## ITEM 14: Typecheck, build, commit, push

```bash
npx tsc --noEmit && npm run build && npm test
```

Fix any failures. Then:

```bash
git add -A && git commit -m "feat: 14 business-critical fixes — billing, intl numbers, security, campaigns, usage tracking" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Item 1. Open `src/app/api/phone/numbers/[id]/release/route.ts`. Add the Twilio DELETE call. GO.
