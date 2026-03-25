# Recall-Touch — Revenue Operating System  
## Product + Go-to-Market Master

Recall-Touch is **not** a CRM, chatbot, marketing tool, or automation platform.  
It is a **Revenue Operator** that controls customer behavior from enquiry → booking → attendance → repeat purchase.

---

## 1. Product category

| Not | Is |
|-----|-----|
| CRM | Revenue Operator |
| Chatbot | Controls full revenue lifecycle |
| Marketing tool | From enquiry → booking → attendance → repeat |
| Automation platform | “Revenue employee” — not “software” |

The system manages the **entire revenue lifecycle**. The product must feel like **hiring a trained front-desk revenue employee**, not installing software.

---

## 2. The revenue lifecycle (6 layers)

All features and UI **must** map to one of these six financial control layers.

| Layer | Name | Goal | Outcome metric |
|-------|------|------|----------------|
| 1 | **Capture** | Prevent paid interest from disappearing | Leads captured |
| 2 | **Convert** | Guide decision | Bookings created |
| 3 | **Secure** | Prevent no-shows | Attendance rate |
| 4 | **Recover** | Revive missed revenue | Recovered revenue |
| 5 | **Retain** | Increase lifetime value | Repeat bookings |
| 6 | **Expand** | Multiply revenue per customer | Revenue per customer |

**System responsibilities by layer**

- **Capture:** Instant replies, missed-call capture, message clarification, lead intent detection, direct conversation routing.
- **Convert:** Qualification conversation, objection handling, direction toward booking, commitment framing, scheduling link delivery.
- **Secure:** Attendance reinforcement, context reminders, emotional commitment reminders, reschedule handling.
- **Recover:** No-show recovery, stalled lead revival, unfinished conversation reactivation.
- **Retain:** Follow-up after visit, rebooking timing, satisfaction check, service cadence guidance.
- **Expand:** Upsell timing detection, review requests, referral prompts, additional service suggestions.

**Rule:** Never expose technical language (automations, workflows, triggers, nodes). Always use layer language and outcome metrics above.

---

## 3. User experience

**User should feel:** “I installed a revenue employee.”  
**Not:** “I configured software.”

### Onboarding

1. Select business type  
2. Connect calendar  
3. Connect communication channel  
**Done.**

The system generates: pipeline, conversation logic, timing rules, follow-ups, reminders.  
**No setup screens.**

### Dashboard

**Do not show:** automations, workflows, triggers, nodes, executions.

**Show: RECEPTIONIST PERFORMANCE**

Top metrics:

- Leads handled  
- Bookings created  
- Shows secured  
- Revenue recovered  
- Repeat customers generated  

---

## 4. AI behavior

The AI is a **receptionist**, not a chat assistant.

- Short, natural messages  
- Direct toward next step  
- Never long explanations  
- Handles objections calmly  
- Redirects irrelevant questions  
- Escalates complex cases  

**Primary objective:** Advance customer to the next revenue stage.

---

## 5. Demo mode (critical for sales)

- System must include a **demo business**.  
- Live simulation: Lead arrives → AI replies → booking → reminders → recovery.  
- Used during sales calls to increase close rate.

---

## 6. Pricing model (for scale)

Pricing aligns to **financial impact**, not messages. Sell access to **revenue layers**.

**Example structure**

- **Starter** — Capture + Convert  
- **Growth** — + Secure + Recover  
- **Pro** — + Retain + Expand  
- **Enterprise** — Multi-location  

Billing scales by: conversations handled, locations, optional human takeover seats.

---

## 7. How we sell it

We **do not** sell software. We sell **outcome replacement**.

### Positioning

**Never say:** AI, automation, chatbot, CRM.

**Always say:**  
“Handles enquiries and follow-ups so more people actually show up and come back.”

### Problem framing

Businesses do not have a “lead problem.” They have a **revenue leakage** problem.

People: ask → delay → forget → hesitate → disappear.  
Recall-Touch **controls that behavior**.

### Sales call flow (demonstration)

1. Ask: “How many enquiries do you get per week?”  
2. Ask: “How many actually show up?”  
3. Calculate lost revenue live  
4. Run demo environment  
5. Show automatic booking  
6. Close: “This replaces the follow-up part of your front desk.”

### Offer structure (agency first)

Install fee + monthly. You install for them initially; later transition to SaaS. Increases early revenue and trust.

---

## 8. Implementation order

Implement in this order:

1. **Lifecycle data model** — 6 layers, mapping from lead/state to layer, outcome metrics.  
2. **Preset business templates** — by vertical / business type.  
3. **Automatic pipeline generation** — from template, no manual workflow build.  
4. **Receptionist conversation behavior** — short, direct, next-step focused.  
5. **Attendance + recovery logic** — secure show-up, revive no-shows and stalled leads.  
6. **Retention + expansion logic** — follow-up, rebook, upsell, referrals.  
7. **Outcome-focused dashboard** — Receptionist Performance only (no tech jargon).  
8. **Demo environment** — live simulation for sales.  
9. **Vertical presets** — industry-specific defaults.

No optional tools. No generic builders. **Opinionated system only.**

---

## 9. Success condition

A business owner should understand within **30 seconds**:

**“This makes more customers show up and come back without us chasing them.”**

Not: “This automates messages.”

---

*Code reference: `src/lib/lifecycle/` — layer definitions, `leadStateToLayer()`, `RECEPTIONIST_PERFORMANCE_METRICS`.*
