# FINAL CLEANUP — Add Missing Locale Keys + Fix Remaining Hardcoded Strings

The codebase has been refactored — most components now use `t()` calls. But some locale keys are MISSING from the JSON files, and a few components still have hardcoded strings. This prompt covers everything remaining.

**Stack**: Next.js App Router · next-intl ^4.8.3 · Locales at `src/i18n/messages/{locale}.json`
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja`

---

## PART 1 — ADD MISSING LOCALE KEYS (Critical — app will break without these)

The code in `AgentsPageClient.tsx` was refactored to use `t()` calls via functions like `getDefaultFaqSeed(t)`, `getAlwaysTransferOptions(t)`, `templateGreeting(id, t)`, `defaultAgent(t)`, `getFaqCategoryTabs(t)`, and `getDefaultObjections(t)`. But the keys don't exist in the locale files yet.

Add these keys under the `"agents"` namespace in ALL 6 locale files:

```json
{
  "agents": {
    "defaultFaq": {
      "hoursQuestion": "What are your hours?",
      "hoursAnswer": "We are open Monday through Friday, 9 AM to 5 PM.",
      "locationQuestion": "Where are you located?",
      "locationAnswer": "I can have someone share our address with you. What is the best way to reach you?",
      "appointmentQuestion": "How do I book an appointment?",
      "appointmentAnswer": "I can help you with that right now. What day works best for you?",
      "servicesQuestion": "What services do you offer?",
      "servicesAnswer": "We offer a full range of services. What specifically are you looking for help with?",
      "pricingQuestion": "What is your pricing?",
      "pricingAnswer": "Pricing depends on your specific needs. I can have our team send you a detailed quote. Can I get your name and email?"
    },
    "defaultTransfer": {
      "explicitlyAsksHuman": "Caller explicitly asks for a human",
      "angryFrustrated": "Caller is angry or frustrated",
      "billingPayments": "Question is about billing or payments",
      "cannotAnswerAttempts": "Agent cannot answer after 2 attempts"
    },
    "templateGreeting": {
      "afterHours": "Hi, you've reached us after hours. I'm the AI assistant — I can take a message, answer questions, or schedule a callback. How can I help?",
      "emergency": "Thank you for calling. If this is an emergency, please hang up and call 911. Otherwise, I can help you right away. What do you need?",
      "leadQualifier": "Thanks for reaching out. I'll ask a few quick questions so we can get you to the right next step.",
      "followUp": "Hi, this is your AI assistant following up so nothing falls through the cracks. Is now a good time?",
      "reviewRequest": "Hi there! We'd love your feedback. Do you have a moment to share your experience?",
      "appointmentSetter": "Hi, I can help you schedule an appointment right now. What day works best for you?",
      "support": "Thanks for calling support. I'm here to help — what can I assist you with today?",
      "receptionist": "Thanks for calling. How can I help you today?"
    },
    "defaultAgent": {
      "receptionist": "Receptionist",
      "hasBudget": "Has budget",
      "hasTimeline": "Has timeline",
      "isDecisionMaker": "Is decision maker",
      "confusedCallerHandling": "If the caller seems confused, ask clarifying questions before transferring.",
      "offTopicHandling": "If the caller asks something off-topic, politely redirect to services you offer."
    },
    "faqCategories": {
      "all": "All",
      "hours": "Hours",
      "services": "Services",
      "pricing": "Pricing",
      "policies": "Policies"
    },
    "defaultObjections": {
      "tooExpensive": "That's too expensive",
      "tooExpensiveResponse": "I understand. Many of our clients felt the same way initially, but found the value far exceeded the cost. Would you like me to walk you through what's included?",
      "thinkAboutIt": "I need to think about it",
      "thinkAboutItResponse": "Of course — take your time. Can I send you some additional information to help with your decision?",
      "alreadyWorking": "We're already working with someone",
      "alreadyWorkingResponse": "That makes sense. Many of our best clients came from similar situations. What would it take for you to consider an alternative?"
    }
  }
}
```

For non-English locales, translate ALL of these strings properly:
- **es.json**: Spanish translations
- **fr.json**: French translations
- **de.json**: German translations
- **pt.json**: Portuguese translations
- **ja.json**: Japanese translations

Also add these keys if missing from `activate` namespace:
```json
{
  "activate": {
    "formName": "Your name",
    "namePlaceholder": "Jane Smith",
    "and": "and"
  }
}
```

And from `contactPage` namespace:
```json
{
  "contactPage": {
    "formSubject": "Subject"
  }
}
```

And from `banners.trial` namespace:
```json
{
  "banners": {
    "trial": {
      "coverageActive": "Coverage active"
    }
  }
}
```

And from `pricing` namespace:
```json
{
  "pricing": {
    "roi": {
      "description": "Model what happens when you stop letting calls slip through to voicemail.",
      "missedCallsPerWeek": "Missed calls per week"
    },
    "faq": "Frequently asked questions",
    "trustedBy": "Trusted by operators who can't afford to miss decisive calls.",
    "questionsTalkToUs": "Questions? Talk to us →"
  }
}
```

And from `messages.liveChat` namespace:
```json
{
  "messages": {
    "liveChat": {
      "voiceInputLabel": "Voice input",
      "messageInputLabel": "Message input",
      "sendMessageLabel": "Send message"
    }
  }
}
```

---

## PART 2 — FIX REMAINING HARDCODED STRINGS

### 2A. `src/components/LiveAgentChat.tsx`
The `AGENTS` const (lines 11-46) has hardcoded name/greeting strings. Refactor to make them translatable:

```tsx
// Replace the static AGENTS object with a function:
function getAgents(t: (k: string) => string): Record<AgentId, { id: AgentId; name: string; initials: string; pill: string; avatarBg: string; greeting: string }> {
  return {
    sarah: {
      id: "sarah",
      name: t("liveChat.agents.professional.name"),
      initials: "P",
      pill: t("liveChat.agents.professional.name"),
      avatarBg: "bg-zinc-600/30 text-zinc-300 border-zinc-500/30",
      greeting: t("liveChat.agents.professional.greeting"),
    },
    alex: {
      id: "alex",
      name: t("liveChat.agents.friendly.name"),
      initials: "F",
      pill: t("liveChat.agents.friendly.name"),
      avatarBg: "bg-zinc-600/30 text-zinc-300 border-zinc-500/30",
      greeting: t("liveChat.agents.friendly.greeting"),
    },
    emma: {
      id: "emma",
      name: t("liveChat.agents.concise.name"),
      initials: "C",
      pill: t("liveChat.agents.concise.name"),
      avatarBg: "bg-zinc-600/30 text-zinc-300 border-zinc-500/30",
      greeting: t("liveChat.agents.concise.greeting"),
    },
  };
}
```

Call `getAgents(t)` inside the component where `t` is available. Add these keys to `messages.liveChat.agents` in all 6 locale files:
```json
{
  "messages": {
    "liveChat": {
      "agents": {
        "professional": { "name": "Professional", "greeting": "Hello. Thanks for calling. How can I help you today?" },
        "friendly": { "name": "Friendly", "greeting": "Hi there! Thanks for reaching out. What can I do for you?" },
        "concise": { "name": "Concise", "greeting": "Hi. How can I help?" }
      }
    }
  }
}
```

### 2B. `src/components/ErrorBoundary.tsx`
The `getMessage()` function (lines 24-47) and default messages (lines 93-95) have hardcoded strings. Since this is a class component and can't use hooks, create a wrapper approach:

Option A (recommended): Accept translated messages via the existing `messages` prop. Create a helper component:
```tsx
// Add after the ErrorBoundary class:
export function TranslatedErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  // This is a functional component that can use hooks
  const t = useTranslations("errors");
  const messages: ErrorBoundaryMessages = {
    getMessage: (category: ErrorCategory) => {
      switch (category) {
        case "network": return { title: t("connectionProblem"), body: t("connectionProblemDesc") };
        case "auth": return { title: t("sessionExpired"), body: t("sessionExpiredDesc") };
        case "data": return { title: t("somethingWrong"), body: t("loadPageError") };
        default: return { title: t("somethingWrong"), body: t("unexpectedError") };
      }
    },
    tryAgain: t("tryAgain"),
    report: t("reportIssue"),
  };
  return <ErrorBoundary messages={messages} fallback={fallback}>{children}</ErrorBoundary>;
}
```

Then update all usages of `<ErrorBoundary>` across the codebase to use `<TranslatedErrorBoundary>` instead.

Add to `errors` namespace in all 6 locale files:
```json
{
  "errors": {
    "connectionProblem": "Connection problem",
    "connectionProblemDesc": "We couldn't reach the server. Check your connection and try again.",
    "sessionExpired": "Session expired",
    "sessionExpiredDesc": "Please sign in again to continue.",
    "somethingWrong": "Something went wrong",
    "loadPageError": "We couldn't load this page. Try again or go back.",
    "unexpectedError": "An unexpected error occurred. You can try again or report the issue.",
    "tryAgain": "Try again",
    "reportIssue": "Report issue"
  }
}
```

### 2C. `src/app/app/agents/components/IdentityStepContent.tsx`
The TEMPLATES array (lines ~45-102) still has hardcoded template names and descriptions. Refactor to a function:
- "Receptionist" → `t("identity.templates.receptionist.label")`
- "Answer calls, take messages, and route cleanly." → `t("identity.templates.receptionist.description")`
- Same for: Appointment Booker, Lead Qualifier, Follow-up Caller, Customer Support, Custom

Add keys to `agents.identity.templates` in all 6 locale files.

### 2D. `src/app/app/agents/components/BehaviorStepContent.tsx`
5 hardcoded escalation trigger strings (lines ~275-279):
- "Asks to speak to a manager" → `t("behavior.escalation.asksForManager")`
- "Gets angry or frustrated" → `t("behavior.escalation.angry")`
- "Has a complex legal or medical question" → `t("behavior.escalation.complexQuestion")`
- "Explicitly requests a human" → `t("behavior.escalation.requestsHuman")`
- "Mentions an emergency" → `t("behavior.escalation.emergency")`

Add keys to `agents.behavior.escalation` in all 6 locale files.

### 2E. `src/app/app/settings/integrations/page.tsx`
The `CRM_INTEGRATIONS` array has hardcoded description strings. Refactor to function taking `t`:
- "Sync contacts and deals with Salesforce" → `t("integrations.crm.salesforce.description")`
- Same for HubSpot, Zoho, Pipedrive, generic, contacts, Outlook

Calendar toast messages (line ~131):
- "Google Calendar connected." → `t("integrations.calendar.connected")`
- "Could not connect Google Calendar." → `t("integrations.calendar.connectFailed")`

### 2F. `src/app/activate/page.tsx`
Metadata strings — use `getTranslations` from `next-intl/server`:
- "Activate your agent" → `t("activatePage.title")`
- "Guided setup to hear your phone agent handle a real call." → `t("activatePage.description")`

---

## VERIFICATION

```bash
# Check ALL keys exist in en.json
python3 -c "
import json
with open('src/i18n/messages/en.json') as f:
    data = json.load(f)
agents = data.get('agents', {})
required = ['defaultFaq','defaultTransfer','templateGreeting','defaultAgent','faqCategories','defaultObjections']
for k in required:
    assert k in agents, f'MISSING: agents.{k}'
    print(f'OK: agents.{k} ({len(agents[k])} keys)')
print('All agent keys present')
"

# Verify no hardcoded strings
grep -n '"Asks to speak to a manager"' src/app/app/agents/components/BehaviorStepContent.tsx
grep -n '"Professional"' src/components/LiveAgentChat.tsx
grep -n '"Connection problem"' src/components/ErrorBoundary.tsx
grep -n '"Receptionist"' src/app/app/agents/components/IdentityStepContent.tsx
grep -n '"Sync contacts"' src/app/app/settings/integrations/page.tsx
# ALL must return empty

# TypeScript check
npx tsc --noEmit

# Build
npm run build

# Commit
git add -A && git commit -m "fix: add missing locale keys + fix remaining hardcoded strings for launch" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
