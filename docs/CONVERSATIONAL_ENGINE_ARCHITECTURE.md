# Recall-Touch Conversational Engine Architecture

**Role:** Voice-first decision pipeline aligned with Revenue Continuity Operator doctrine.  
**Objective:** Low-latency, context-aware voice that moves callers toward **decisions** (booking, attendance, commitment)—not persuasion or scripts.

---

## Doctrine Alignment

This engine implements the **Signal → State → Decision → Action → Proof** pipeline. It does **not**:

- Offer dynamic discounts or sales-closing pressure (Constitution: reduce uncertainty, not pressure).
- Expose prompt editors or workflow builders.
- Use a generic "persuasive" tone (Doctrine: receptionist-grade, calm, professional).

It **does**:

- Continue conversations, clarify intent, resolve hesitation, schedule commitments, protect attendance (Constitution).
- Inject context from workspace/lead/availability before each turn (Context-Aware Buffer).
- Use a Brain with **function calling** for availability and booking (no made-up slots).
- Apply a **Resiliency Layer** for background noise and filler words.
- Enforce a **Shadow-Prompt** (brand voice: helpful, professional, no persuasion).

---

## Core Architecture

```
[ Telephony: Vapi/Retell ]  ←→  [ RecallAgent ]
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
              [ Brain ]        [ ResiliencyLayer ]   [ ShadowPrompt ]
              (functions)      (noise/filler)        (brand voice)
                    │
                    ▼
              [ Context Buffer ]
              (CRM + product + availability)
```

### 1. Low-Latency Pipeline

- **Existing:** Vapi for TTS/STT and voice; Twilio for telephony. Streaming is handled by Vapi.
- **Target:** &lt;500ms first-byte where possible; keep prompts and context minimal so LLM latency stays low.
- **Implementation:** Context buffer is pre-fetched per call/session; Brain functions are synchronous where possible (availability check, business hours). No blocking RAG at turn-time for the hot path.

### 2. Dynamic Context Injection (Context-Aware Buffer)

Before each turn (or at call start), the engine pulls:

- **Workspace:** `workspace_business_context` (offer, hours, FAQ, booking_link).
- **Lead:** Current lifecycle state, last outcome, open commitments (from `leads`, `commitment_registry` / existing schema).
- **Product/Knowledge:** FAQ and tone from business context; no separate RAG unless required for compliance (e.g. regulated disclosures).

Context is passed into the **system prompt** (existing `compileSystemPrompt` + Shadow-Prompt) and, where needed, into **Brain** function inputs (e.g. workspace_id for availability).

### 3. Multi-Turn Intent & Interruptions

- **State machine:** Conversation state (e.g. greeting → qualifying → booking → confirmation) is modeled so the agent can handle **topic switching** and **interruptions** without breaking flow. Transitions are deterministic where possible (e.g. "book now" → booking state).
- **Implementation:** Lightweight state machine (or XState) in `RecallAgent` that drives which Brain functions are in scope and what the Shadow-Prompt emphasizes (e.g. "confirm the time" vs "clarify what they need"). Human-like interruptions = allow barge-in and state transition back to clarifying when the user changes topic.

### 4. Revenue-First Logic (Doctrine-Compliant)

- **No:** "Sales-Closing" module that detects hesitation and offers **dynamic discounts** (forbidden: persuasion, pressure).
- **Yes:** **Commitment/Booking module** that:
  - Detects intent to book or commit.
  - Calls **Brain** to check real-time availability (function calling).
  - Offers **booking link** or next-available slot from the system (no made-up times).
  - Resolves hesitation by clarifying options (e.g. "I have Tuesday at 2pm or Wednesday at 10am—which works?"), not by discounting.

---

## Component Contracts

### RecallAgent (Orchestrator)

- **Inputs:** `workspaceId`, `leadId` (optional), `channel` (voice), call/session id.
- **Responsibilities:** Load context buffer; build system prompt (Business Brain + Shadow-Prompt); register Brain functions with the LLM; apply ResiliencyLayer to raw STT if needed; hand off to telephony (Vapi).
- **Outputs:** Assistant config for Vapi (system prompt, first message, tools); or streaming/WebSocket payloads if we add a custom streaming path later.
- **Scaling:** Stateless per call; context and availability fetched per request. At 100k concurrent calls, rely on DB connection pooling, caching of business context per workspace, and idempotent availability reads.

### Brain (Function Calling)

- **Purpose:** Real-time checks so the LLM never hallucinates availability or pricing.
- **Functions:**
  - `check_availability(workspace_id, date?, service?)` → next available slots (from calendar or workspace config).
  - `get_booking_link(workspace_id)` → booking_link from business context.
  - `record_commitment_intent(workspace_id, lead_id, intent)` → enqueue or record that the lead intends to book (emits canonical signal; no direct send).
- **Contract:** All functions return structured JSON; no side effects except via canonical actions (e.g. record_commitment_intent writes to tables that the rest of the pipeline consumes). Errors return a safe message ("Availability check is temporarily unavailable; I'll have someone confirm.").

### Resiliency Layer

- **Input:** Raw transcript or STT segment.
- **Processing:** Strip filler words (um, ah, like) and normalize fragments; optional silence/noise detection to avoid treating noise as intent.
- **Output:** Cleaned text for state machine and LLM. Optionally: confidence or "needs_repeat" flag to trigger a single re-prompt.
- **Error handling:** On repeated failures (e.g. noise), transition to "I'll have someone call you back" and log; no infinite retries.

### Shadow-Prompt (Brand Voice)

- **Content:** Instructions appended to the system prompt so the LLM stays:
  - **Helpful:** Answer questions from FAQ and business context; offer next step.
  - **Professional:** Short, natural, receptionist-grade; no corporate jargon, no over-eagerness.
  - **Not persuasive:** No pressure, no "limited time," no dynamic discounts; resolve hesitation by clarifying and offering options (e.g. booking slots), not by pushing.
- **Storage:** In code or in `workspace_business_context.tone_guidelines`; not user-editable prompt editors (Constitution: no prompt editors).

---

## Data & Stack

- **Database:** Supabase (PostgreSQL). Existing tables: `call_sessions`, `workspace_business_context`, `leads`, `commitment_registry`, canonical signals, etc. **No Prisma**; use existing `getDb()` and schema.
- **Call logs & conversion metrics:** Already in `call_sessions` (summary, recording_url, call_ended_at), activation_events, and outcome tables. Add or reuse columns as needed for conversion (e.g. booking_intent_recorded_at).
- **Dashboard:** Existing Recall-Touch UI; no mandate to introduce shadcn. Use current design system and components.
- **Telephony:** Vapi (and Twilio) already integrated; RecallAgent produces the assistant config and tools; telephony remains a separate layer (Clean Architecture: prompt logic vs telephony provider).

---

## Error Handling & Scaling

- **Per call:** Timeouts on context fetch (e.g. 2s); fallback to minimal prompt and "I'll have someone get back to you" if Brain or context fails. No stack traces to client; log server-side.
- **Availability:** Brain functions use read-only or single-write paths; avoid long-running transactions. Cache business hours per workspace with short TTL.
- **100k concurrent:** Stateless agents; horizontal scaling of API and workers; DB pool limits and read replicas for context/availability; idempotent signal writes. ResiliencyLayer and Shadow-Prompt add minimal CPU; latency budget dominated by LLM and telephony.

---

## File Layout

- `src/lib/conversational-engine/RecallAgent.ts` — Orchestrator.
- `src/lib/conversational-engine/Brain.ts` — Function calling (availability, booking link, record intent).
- `src/lib/conversational-engine/ResiliencyLayer.ts` — Filler stripping, noise handling.
- `src/lib/conversational-engine/shadow-prompt.ts` — Brand voice fragment.
- `src/lib/conversational-engine/context-buffer.ts` — Load workspace + lead context.
- `src/lib/conversational-engine/index.ts` — Public API.

## Integration

Use from API routes (e.g. Twilio voice webhook or business-brain) when building a Vapi assistant:

```ts
import { RecallAgent } from "@/lib/conversational-engine";
import { getDb } from "@/lib/db/queries";

const agent = new RecallAgent({ workspaceId, leadId, agentName, greeting, getDb });
const { systemPrompt, firstMessage, tools } = await agent.build();
// Pass systemPrompt + firstMessage to createAssistant(); when Vapi supports tools, pass tools.
// For server-side tool execution when LLM calls a function: agent.runBrainFunction(name, params).
```

Canonical doctrine: `docs/RECALL_TOUCH_DOCTRINE.md`, `docs/RECALL_TOUCH_CONSTITUTION.md`, `docs/ARCHITECTURE_DOCTRINE.md`.
