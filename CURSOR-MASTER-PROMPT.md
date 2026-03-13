You are an implementation engineer. There are TWO priorities: fix a launch-blocking i18n bug, then create a voice provider abstraction layer so the system can swap off Vapi to a cheaper provider. Do not plan. Do not narrate. Open files, edit, save, move on.

---

## ITEM 1 — CRITICAL: Fix i18n key path bug in agent step labels

There are TWO files with the same bug. Both store step labels with a redundant `"agents."` prefix. Since `useTranslations("agents")` already scopes to the `agents` namespace, calling `t("agents.steps.identity")` resolves to the non-existent path `agents.agents.steps.identity`.

**File A: `src/app/app/agents/AgentsPageClient.tsx` (lines ~163-169)**

Change the SETUP_STEPS array from:
```ts
{ id: "identity", label: "agents.steps.identity", description: "agents.steps.identityDescription" },
{ id: "voice", label: "agents.steps.voice", description: "agents.steps.voiceDescription" },
{ id: "knowledge", label: "agents.steps.knowledge", description: "agents.steps.knowledgeDescription" },
{ id: "behavior", label: "agents.steps.behavior", description: "agents.steps.behaviorDescription" },
{ id: "test", label: "agents.steps.test", description: "agents.steps.testDescription" },
{ id: "golive", label: "agents.steps.golive", description: "agents.steps.goliveDescription" },
```
To:
```ts
{ id: "identity", label: "steps.identity", description: "steps.identityDescription" },
{ id: "voice", label: "steps.voice", description: "steps.voiceDescription" },
{ id: "knowledge", label: "steps.knowledge", description: "steps.knowledgeDescription" },
{ id: "behavior", label: "steps.behavior", description: "steps.behaviorDescription" },
{ id: "test", label: "steps.test", description: "steps.testDescription" },
{ id: "golive", label: "steps.golive", description: "steps.goliveDescription" },
```

**File B: `src/app/app/agents/components/AgentDetail.tsx` (lines ~50-79)**

Apply the exact same fix — remove the `"agents."` prefix from every label and description string in the SETUP_STEPS array.

---

## ITEM 2 — CRITICAL: Add 7 missing i18n keys to en.json

**File: `src/i18n/messages/en.json`**

**A) Add to the `"agents"` object** (after the existing `"steps"` block, around line 255):

```json
"status": {
  "live": "Live",
  "ready": "Ready",
  "calls": "calls"
},
"links": {
  "analytics": "Analytics",
  "flow": "Flow builder"
},
```

**B) Add to the `"common"` object** (after `"loadingApp"`, around line 53):

```json
"status": {
  "active": "Active",
  "inactive": "Inactive"
},
```

**C) Copy the same 7 keys into ALL other locale files:**
- `src/i18n/messages/es.json`
- `src/i18n/messages/fr.json`
- `src/i18n/messages/de.json`
- `src/i18n/messages/pt.json`
- `src/i18n/messages/ja.json`

Use the English values as placeholders. The structure must match exactly.

---

## ITEM 3: Create voice provider abstraction layer

The current codebase is tightly coupled to Vapi (44 files). Create an abstraction layer so we can swap providers without rewriting the entire app.

**A) Create `src/lib/voice/types.ts`:**
```ts
export interface VoiceProviderConfig {
  provider: "vapi" | "retell" | "bland" | "custom";
  apiKey: string;
  phoneNumberId?: string;
  publicKey?: string;
}

export interface CreateAssistantParams {
  name: string;
  systemPrompt: string;
  voiceId: string;
  voiceProvider: "elevenlabs" | "deepgram" | "playht";
  voiceModel?: string;
  language?: string;
  sttModel?: string;
  sttProvider?: string;
  tools?: AssistantTool[];
  maxDuration?: number;
  silenceTimeout?: number;
  backgroundDenoising?: boolean;
  metadata?: Record<string, string>;
}

export interface AssistantTool {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface CreateCallParams {
  assistantId: string;
  phoneNumber: string;
  fromNumber?: string;
  metadata?: Record<string, string>;
  voicemailBehavior?: "leave_message" | "hangup" | "sms";
  voicemailMessage?: string;
}

export interface CallResult {
  callId: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
  provider: string;
}

export interface WebhookEvent {
  type: "call-started" | "tool-call" | "end-of-call" | "transcript";
  callId: string;
  metadata?: Record<string, string>;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  duration?: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface VoiceProvider {
  createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }>;
  updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>): Promise<void>;
  deleteAssistant(assistantId: string): Promise<void>;
  createOutboundCall(params: CreateCallParams): Promise<CallResult>;
  createInboundCall(twilioCallSid: string, assistantId: string): Promise<string>; // returns TwiML
  parseWebhookEvent(body: unknown): WebhookEvent;
}
```

**B) Create `src/lib/voice/providers/vapi.ts`:**
Implement the `VoiceProvider` interface wrapping the existing code from `src/lib/vapi/client.ts`. Move ALL Vapi-specific logic (API URL, headers, request format) here. Import from `src/lib/vapi/client.ts` where possible — DO NOT rewrite working code, just wrap it.

**C) Create `src/lib/voice/index.ts`:**
```ts
import { VoiceProvider, VoiceProviderConfig } from "./types";
import { VapiProvider } from "./providers/vapi";

export function getVoiceProvider(config?: VoiceProviderConfig): VoiceProvider {
  const provider = config?.provider ?? process.env.VOICE_PROVIDER ?? "vapi";
  switch (provider) {
    case "vapi":
      return new VapiProvider();
    // Future: case "retell": return new RetellProvider();
    // Future: case "bland": return new BlandProvider();
    default:
      return new VapiProvider();
  }
}

export * from "./types";
```

**D) Update ONE API route as proof of concept:**
In `src/app/api/agents/[id]/test-call/route.ts`, replace direct Vapi imports with:
```ts
import { getVoiceProvider } from "@/lib/voice";
const voice = getVoiceProvider();
```

Then use `voice.createOutboundCall()` instead of the direct Vapi call. Keep the existing behavior identical.

**E) Add env var:**
Add `VOICE_PROVIDER=vapi` to `.env.example` (or `.env.local.example`). Document that this can be changed to swap providers.

DO NOT refactor all 44 files. Just create the abstraction layer + update the one test-call route. The rest will be migrated incrementally.

---

## ITEM 4: Typecheck, build, commit, push

```bash
npx tsc --noEmit && npm run build && npm test
```

Fix any failures. Then:

```bash
git add -A && git commit -m "fix: i18n agent keys + voice provider abstraction layer" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.

---

START. Item 1. Open AgentsPageClient.tsx line 163. Fix the step labels. GO.
