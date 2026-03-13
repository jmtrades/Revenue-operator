You are an implementation engineer. TWO major tasks: (1) Replace Vapi with ElevenLabs Conversational AI as the voice provider, and (2) upgrade frontend aesthetics to eliminate generic "AI slop" design. Do not plan. Do not narrate. Open files, edit, save, move on.

---

## ITEM 1: Implement ElevenLabs Conversational AI provider

The abstraction layer already exists at `src/lib/voice/`. Now implement the ElevenLabs Conversational AI provider and make it the default.

### A) Install the ElevenLabs SDK

```bash
npm install elevenlabs
```

### B) Create `src/lib/voice/providers/elevenlabs-conversational.ts`

Implement the `VoiceProvider` interface from `src/lib/voice/types.ts` using ElevenLabs Conversational AI API.

```ts
"use client";
// Note: server-side operations will use the REST API, not the client SDK

import type {
  VoiceProvider,
  CreateAssistantParams,
  CreateCallParams,
  CallResult,
  WebhookEvent,
} from "../types";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

function getElevenLabsApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export class ElevenLabsConversationalProvider implements VoiceProvider {
  private headers() {
    return {
      "xi-api-key": getElevenLabsApiKey(),
      "Content-Type": "application/json",
    };
  }

  async createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }> {
    // Create a Conversational AI agent
    // Docs: https://elevenlabs.io/docs/conversational-ai/api-reference
    const body = {
      name: params.name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: params.systemPrompt,
            llm: "claude-sonnet-4-20250514",
            temperature: 0.45,
            max_tokens: 350,
          },
          first_message: params.metadata?.greeting || "Hello, how can I help you today?",
          language: params.language || "en",
        },
        tts: {
          voice_id: params.voiceId,
          model_id: "eleven_turbo_v2_5",
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.35,
          speed: 1.0,
          optimize_streaming_latency: 3,
        },
        stt: {
          provider: "deepgram",
          model: "nova-2",
        },
        turn: {
          silence_timeout_ms: 30000,
          max_duration_seconds: params.maxDuration || 600,
        },
      },
      platform_settings: {
        auth: {
          enable_auth: false,
        },
      },
    };

    // Add tool definitions if provided
    if (params.tools && params.tools.length > 0) {
      (body.conversation_config.agent as Record<string, unknown>).tools = params.tools.map((tool) => ({
        type: "webhook",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
    }

    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/create`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs createAssistant failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return { assistantId: data.agent_id };
  }

  async updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>): Promise<void> {
    const body: Record<string, unknown> = {};
    if (params.name) body.name = params.name;
    if (params.systemPrompt || params.voiceId || params.language) {
      body.conversation_config = {};
      if (params.systemPrompt) {
        (body.conversation_config as Record<string, unknown>).agent = {
          prompt: { prompt: params.systemPrompt },
        };
      }
      if (params.voiceId) {
        (body.conversation_config as Record<string, unknown>).tts = {
          voice_id: params.voiceId,
        };
      }
    }

    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${assistantId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs updateAssistant failed: ${res.status} ${err}`);
    }
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${assistantId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs deleteAssistant failed: ${res.status} ${err}`);
    }
  }

  async createOutboundCall(params: CreateCallParams): Promise<CallResult> {
    // Use ElevenLabs phone call API
    const body = {
      agent_id: params.assistantId,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: params.phoneNumber,
      metadata: params.metadata,
    };

    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs outbound call failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return {
      callId: data.call_id || data.conversation_id,
      status: "queued",
      provider: "elevenlabs",
    };
  }

  async createInboundCall(twilioCallSid: string, assistantId: string): Promise<string> {
    // For inbound: ElevenLabs Twilio integration handles this via
    // the phone number webhook configuration pointing to ElevenLabs
    // Return TwiML that connects to ElevenLabs
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${assistantId}">
      <Parameter name="call_sid" value="${twilioCallSid}" />
    </Stream>
  </Connect>
</Response>`;
  }

  parseWebhookEvent(body: unknown): WebhookEvent {
    const data = body as Record<string, unknown>;
    const eventType = data.type as string;

    // Map ElevenLabs webhook events to our standard format
    switch (eventType) {
      case "conversation.started":
        return {
          type: "call-started",
          callId: (data.conversation_id as string) || "",
          metadata: data.metadata as Record<string, string>,
        };
      case "conversation.tool_call":
        return {
          type: "tool-call",
          callId: (data.conversation_id as string) || "",
          toolName: (data.tool_call as Record<string, unknown>)?.name as string,
          toolArgs: (data.tool_call as Record<string, unknown>)?.parameters as Record<string, unknown>,
          metadata: data.metadata as Record<string, string>,
        };
      case "conversation.ended":
        return {
          type: "end-of-call",
          callId: (data.conversation_id as string) || "",
          transcript: data.transcript as string,
          summary: data.summary as string,
          recordingUrl: data.recording_url as string,
          duration: data.duration_seconds as number,
          metadata: data.metadata as Record<string, string>,
        };
      default:
        return {
          type: "call-started",
          callId: (data.conversation_id as string) || "",
          metadata: data.metadata as Record<string, string>,
        };
    }
  }
}
```

### C) Update `src/lib/voice/index.ts`

Add the ElevenLabs provider and make it the default:

```ts
import { VoiceProvider, VoiceProviderConfig } from "./types";
import { VapiProvider } from "./providers/vapi";
import { ElevenLabsConversationalProvider } from "./providers/elevenlabs-conversational";

export function getVoiceProvider(config?: VoiceProviderConfig): VoiceProvider {
  const provider = config?.provider ?? process.env.VOICE_PROVIDER ?? "elevenlabs";
  switch (provider) {
    case "elevenlabs":
      return new ElevenLabsConversationalProvider();
    case "vapi":
      return new VapiProvider();
    default:
      return new ElevenLabsConversationalProvider();
  }
}

export * from "./types";
```

### D) Update `src/lib/voice/types.ts`

Add `"elevenlabs"` to the provider union:
```ts
export interface VoiceProviderConfig {
  provider: "vapi" | "retell" | "bland" | "elevenlabs" | "custom";
  // ... rest stays the same
}
```

### E) Create webhook route `src/app/api/webhooks/elevenlabs/route.ts`

This handles ElevenLabs conversation events. Model it after the existing Vapi webhook at `src/app/api/webhooks/vapi/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getVoiceProvider } from "@/lib/voice";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const voice = getVoiceProvider();
    const event = voice.parseWebhookEvent(body);

    const workspaceId = event.metadata?.workspace_id;

    switch (event.type) {
      case "call-started": {
        await supabase.from("call_sessions").insert({
          workspace_id: workspaceId,
          external_meeting_id: event.callId,
          provider: "elevenlabs",
          status: "in_progress",
          started_at: new Date().toISOString(),
        });
        break;
      }

      case "tool-call": {
        // Handle tool calls same as Vapi webhook
        if (event.toolName === "capture_lead") {
          await supabase.from("leads").insert({
            workspace_id: workspaceId,
            name: (event.toolArgs?.name as string) || "Unknown",
            phone: (event.toolArgs?.phone as string) || "",
            email: (event.toolArgs?.email as string) || "",
            source: "ai_call",
          });
        }
        if (event.toolName === "book_appointment") {
          await supabase.from("appointments").insert({
            workspace_id: workspaceId,
            date: event.toolArgs?.date as string,
            time: event.toolArgs?.time as string,
            service: event.toolArgs?.service as string,
            notes: event.toolArgs?.notes as string,
            phone: event.toolArgs?.phone as string,
          });
        }
        break;
      }

      case "end-of-call": {
        await supabase
          .from("call_sessions")
          .update({
            status: "completed",
            transcript: event.transcript,
            summary: event.summary,
            recording_url: event.recordingUrl,
            duration_seconds: event.duration,
            ended_at: new Date().toISOString(),
          })
          .eq("external_meeting_id", event.callId);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ElevenLabs webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
```

### F) Update `.env.example`

Add these env vars:
```
# Voice Provider (elevenlabs or vapi)
VOICE_PROVIDER=elevenlabs

# ElevenLabs Conversational AI
ELEVENLABS_API_KEY=
ELEVENLABS_PHONE_NUMBER_ID=

# Legacy Vapi (keep for fallback)
# VAPI_API_KEY=
# VAPI_PHONE_NUMBER_ID=
# NEXT_PUBLIC_VAPI_PUBLIC_KEY=
```

### G) Update the Twilio inbound webhook

In `src/app/api/webhooks/twilio/voice/route.ts`, update the fallback logic to use the voice provider abstraction instead of directly calling Vapi:

Find any direct `import` from `@/lib/vapi/client` and replace with:
```ts
import { getVoiceProvider } from "@/lib/voice";
```

Then replace any `createCallForTwilio()` call with:
```ts
const voice = getVoiceProvider();
const twiml = await voice.createInboundCall(twilioCallSid, assistantId);
```

### H) Update outbound call execution

In `src/lib/outbound/execute-lead-call.ts`, replace Vapi imports with:
```ts
import { getVoiceProvider } from "@/lib/voice";
```

Replace `createOutboundCall()` with:
```ts
const voice = getVoiceProvider();
const result = await voice.createOutboundCall({
  assistantId,
  phoneNumber: lead.phone,
  metadata: { workspace_id: workspaceId, call_session_id: sessionId },
});
```

### I) Update agent sync

In `src/lib/agents/sync-vapi-agent.ts`, replace Vapi imports with voice provider abstraction. The function should use `getVoiceProvider()` instead of directly calling Vapi API. Keep the same system prompt building logic — just change the transport.

DO NOT touch `src/lib/agents/build-vapi-system-prompt.ts` — the system prompt logic is provider-agnostic. Just rename the file to `build-agent-system-prompt.ts` and update all imports.

---

## ITEM 2: Frontend aesthetics overhaul

The current design is solid but uses Inter (generic body font), has minimal background atmosphere, and lacks distinctive motion. Apply these targeted upgrades to elevate from "clean SaaS" to "premium, distinctive product."

### A) Replace Inter with a distinctive body font

In `src/app/[locale]/layout.tsx` (or wherever Google Fonts are imported):

Replace Inter import with **Satoshi** (from Google Fonts or self-hosted). If Satoshi is not on Google Fonts, use **DM Sans** as the alternative.

```ts
import { DM_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body-sans",
});
```

Update `globals.css` to reference the new font variable. Keep Playfair Display for headlines — it's distinctive.

### B) Add atmospheric depth to hero background

In the hero section component (likely `src/components/home/Hero.tsx` or similar), add layered visual depth:

After the existing radial gradient, add a subtle geometric noise texture and floating ambient particles using CSS only:

```css
.hero-atmosphere {
  position: relative;
  overflow: hidden;
}

.hero-atmosphere::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 40% at 20% -10%, rgba(79, 140, 255, 0.12), transparent 70%),
    radial-gradient(ellipse 40% 30% at 80% 20%, rgba(0, 212, 170, 0.06), transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(79, 140, 255, 0.02) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.hero-atmosphere::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
```

### C) Upgrade card hover effects

Add a subtle glow-on-hover to feature cards in `globals.css`:

```css
.card-feature {
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.card-feature:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 32px rgba(79, 140, 255, 0.08),
    0 0 0 1px rgba(79, 140, 255, 0.12);
}
```

### D) Orchestrate page load animation

In the homepage, add staggered reveal on load. In `src/app/[locale]/page.tsx` or the homepage wrapper:

Add progressive `animation-delay` to each section so they cascade in:

```css
.section-animate {
  opacity: 0;
  animation: slideUp 0.6s ease forwards;
}
.section-animate:nth-child(1) { animation-delay: 0ms; }
.section-animate:nth-child(2) { animation-delay: 80ms; }
.section-animate:nth-child(3) { animation-delay: 160ms; }
.section-animate:nth-child(4) { animation-delay: 240ms; }
.section-animate:nth-child(5) { animation-delay: 320ms; }
```

Apply `.section-animate` class to each homepage section wrapper.

### E) Upgrade CTA buttons

Replace flat blue buttons with subtle gradient + glow:

```css
.btn-primary {
  background: linear-gradient(135deg, #4F8CFF 0%, #3B6FE0 100%);
  box-shadow: 0 0 20px rgba(79, 140, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  box-shadow: 0 0 30px rgba(79, 140, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}
```

### F) Add text gradient to hero headline

Make the main hero headline use a subtle gradient for premium feel:

```css
.hero-headline {
  background: linear-gradient(135deg, #FFFFFF 0%, #B8D4FF 50%, #FFFFFF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## ITEM 3: Typecheck, build, commit, push

```bash
npx tsc --noEmit && npm run build && npm test
```

Fix any failures. Then:

```bash
git add -A && git commit -m "feat: ElevenLabs Conversational AI provider + frontend aesthetics upgrade" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Item 1A. Run `npm install elevenlabs`. Then create the ElevenLabs provider file. GO.
