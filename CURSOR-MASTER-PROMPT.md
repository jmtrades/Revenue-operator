# FINAL LAUNCH PROMPT — Complete i18n for Homepage, Footer, and Missing Locale Keys

This is the definitive final prompt before launch. Users are waiting. The product app is 95% complete on i18n. The critical remaining gaps are:

1. **Footer shows raw translation keys** — keys like `tagline`, `product`, `features`, `company`, `emailUs`, `blog`, `contact`, `legalSecurity`, `privacyPolicy`, `termsOfService`, `securityBadges` are used in Footer.tsx but DON'T EXIST in any locale file
2. **Homepage sections are 80%+ untranslated English** — 22 of 26 section components have zero i18n
3. **Missing locale keys for AgentsPageClient refactored functions** — code uses t() but keys don't exist in JSON files

---

## GLOBAL RULES

**Stack**: Next.js App Router · React 19 · TypeScript · next-intl ^4.8.3 · Tailwind CSS v4
**Locales**: `en`, `es`, `fr`, `de`, `pt`, `ja` at `src/i18n/messages/{locale}.json`
**Pattern**: `useTranslations("namespace")` → `t("key")` = `namespace.key` in JSON
**For every file**: Add new keys under the appropriate namespace in ALL 6 locale files with proper translations.

---

## PART 1 — FOOTER (CRITICAL — raw keys visible to all users on every page)

### File: `src/components/sections/Footer.tsx`

The component uses `useTranslations("footer")` and calls these keys:
- `t("tagline")` — line 23
- `t("product")` — line 28
- `t("features")` — line 31
- `t("pricing")` — line 34
- `t("demo")` — line 37
- `t("docs")` — line 40
- `t("company")` — line 45
- `t("emailUs")` — line 48
- `t("blog")` — line 51
- `t("contact")` — line 54
- `t("legalSecurity")` — line 59
- `t("privacyPolicy")` — line 62
- `t("termsOfService")` — line 65
- `t("securityBadges")` — line 68
- `t("copyright", { year })` — line 74 (this one EXISTS already)

The `footer` namespace currently only has: `cta`, `links`, `copyright`. Add ALL missing keys.

**Add to `footer` namespace in ALL 6 locale files:**

```json
{
  "footer": {
    "tagline": "AI phone and text communication for businesses that depend on every call.",
    "product": "Product",
    "features": "Features",
    "pricing": "Pricing",
    "demo": "Demo",
    "docs": "Docs",
    "company": "Company",
    "emailUs": "Email us",
    "blog": "Blog",
    "contact": "Contact",
    "legalSecurity": "Legal & Security",
    "privacyPolicy": "Privacy Policy",
    "termsOfService": "Terms of Service",
    "securityBadges": "SOC 2 · GDPR · 256-bit encryption · 99.9% uptime",
    "copyright": "© {year} Recall Touch. All rights reserved.",
    "cta": {
      "bookDemo": "Book a demo",
      "contact": "Contact"
    },
    "links": {
      "product": "Product",
      "pricing": "Pricing",
      "docs": "Docs",
      "terms": "Terms",
      "privacy": "Privacy"
    }
  }
}
```

**Spanish (es.json):**
```json
{
  "footer": {
    "tagline": "Comunicación telefónica y por texto con IA para negocios que dependen de cada llamada.",
    "product": "Producto",
    "features": "Características",
    "pricing": "Precios",
    "demo": "Demo",
    "docs": "Documentación",
    "company": "Empresa",
    "emailUs": "Escríbenos",
    "blog": "Blog",
    "contact": "Contacto",
    "legalSecurity": "Legal y Seguridad",
    "privacyPolicy": "Política de Privacidad",
    "termsOfService": "Términos de Servicio",
    "securityBadges": "SOC 2 · RGPD · Cifrado 256 bits · 99,9% disponibilidad",
    "copyright": "© {year} Recall Touch. Todos los derechos reservados."
  }
}
```

Translate similarly for fr, de, pt, ja — proper native translations, not English placeholders.

---

## PART 2 — HOMEPAGE SECTIONS (22 components with hardcoded English)

All of these files are in `src/components/sections/`. Each needs `useTranslations` added with a dedicated namespace. Create one namespace per section or group them under a `homepage` namespace.

### 2A. `ProblemStatement.tsx`
Add `useTranslations("homepage")` and replace ALL hardcoded strings:
- "THE PROBLEM" section label
- "Phone communication is broken. For everyone." heading
- All 3 problem cards: titles, stats, descriptions
- "$126K", "80%", "93%", "51%", "42 hrs", "44%", "$35K", "30-45%", "4+" — keep numbers, translate labels
- "Lost per year to missed calls", "Hang up on voicemail", "Never call back after busy signal" etc.
- "Calls fall through the cracks", "Follow-up is broken", "Communication doesn't scale"

### 2B. `HowItWorks.tsx`
Add `useTranslations("homepage")` and replace:
- "HOW IT WORKS" section label
- "Three steps. Then it runs." heading
- Step 1: "Connect" title + "Forward your number or get a new one. Any carrier. Any phone." description
- Step 2: "Configure" title + description
- Step 3: "Done" title + description

### 2C. `HomepageLiveDemo.tsx`
Add `useTranslations("homepage")` and replace:
- "Hear the difference in 30 seconds" heading
- Description text
- Tab labels: "Missed call recovery", "Appointment booking", "Lead follow-up", "After-hours handling", "Call screening"
- All conversation content (Caller / AI Agent lines)
- Result labels

### 2D. `OutcomeCardsSection.tsx`
Add `useTranslations("homepage")` and replace:
- "What you get from day one" heading
- "Outcomes, not infrastructure..." subtitle
- Card titles: "Missed calls recovered", "Leads captured automatically", "Appointments booked on the spot"
- Card descriptions

### 2E. `Features.tsx`
Add `useTranslations("homepage")` and replace:
- "WHAT IT DOES" section label
- "Everything your phone communication needs. Nothing it used to cost." heading
- All 11+ feature cards: titles and descriptions
- "Answers every call", "Unified inbox", "Makes outbound calls", "Outbound campaigns", "Books appointments", "Captures every lead", "Smart routing", "Two-way texting", "Learns your world", "Shows your ROI", "Never gives up"

### 2F. `UseCaseSection.tsx`
Add `useTranslations("homepage")` and replace:
- "One platform. Every call type." heading
- Inbound / Outbound / Intelligence category labels
- All feature descriptions under each category

### 2G. `WhoUsesSection.tsx`
Add `useTranslations("homepage")` and replace:
- "WHO USES RECALL TOUCH" section label
- "Built for businesses that depend on every call" heading
- All 6 use case cards: "Solo operators", "Growing teams", "Agencies & multi-location", "After-hours & overflow", "Outbound campaigns", "Anyone with a phone"
- Card descriptions
- "Don't see your use case?" footer text

### 2H. `MetricsSection.tsx`
Add `useTranslations("homepage")` and replace:
- "The numbers that matter" heading
- All metric labels: "$126K", "100%", "60 sec", "1 inbox", "5 min"
- Descriptions for each metric

### 2I. `TestimonialsSection.tsx`
Add `useTranslations("homepage")` and replace:
- "WHAT CUSTOMERS SAY" section label
- "What customers say" heading (or similar)
- All 5 testimonial quotes, names, and roles
- "Trusted by businesses that never miss a call" footer

### 2J. `PricingPreview.tsx`
Add `useTranslations("homepage")` and replace:
- "PRICING" section label
- "Plans that pay for themselves." heading
- "Simple pricing that matches your revenue" subtitle
- Plan names, prices, feature lists
- "Start free" / "Talk to sales" CTAs
- "All plans include:" text
- "View full plan comparison →" link

### 2K. `WhatMakesUsDifferentSection.tsx`
Add `useTranslations("homepage")` and replace:
- "What makes us different" heading
- Comparison table headers and content
- All row labels and cell content

### 2L. `EnterpriseComparisonCard.tsx`
Add `useTranslations("homepage")` and replace:
- Enterprise comparison copy
- "$150,000/year" reference text
- Comparison descriptions

### 2M. `FinalCTA.tsx`
Add `useTranslations("homepage")` and replace:
- "Your AI phone team starts in 5 minutes" heading
- "No credit card. Set up in 5 minutes. Answer every call." subtitle
- "Start free →" and "Book a demo →" buttons
- "Works for calls, texts, scheduling, follow-ups, and campaigns. One platform." description
- "View documentation" link

### 2N. `ScrollDepthCTA.tsx`
Add `useTranslations("homepage")` and replace any hardcoded CTA text.

### 2O. `TrustStackSection.tsx`
Add `useTranslations("homepage")` and replace:
- "TRUST & COMPLIANCE" section label (or similar)
- Trust badge descriptions
- SOC 2, GDPR, encryption, uptime labels

### 2P. `Industries.tsx`
Add `useTranslations("homepage")` and replace any industry labels.

### 2Q. `BentoVisuals.tsx`
Add `useTranslations("homepage")` and replace any visible text.

### 2R-2V. Remaining section files
Check each of these for hardcoded strings and add i18n:
- `HomepageActivitySection.tsx`
- `HomepageActivityPreview.tsx`
- `ActivityFeedMockup.tsx`
- `MockDashboard.tsx`
- `UseCases.tsx`

**For the `homepage` namespace**: Create it in all 6 locale files with ALL keys. English gets the original text. Spanish, French, German, Portuguese, Japanese get proper native translations.

---

## PART 3 — MISSING AGENT LOCALE KEYS (Code uses t() but keys don't exist)

The code in `AgentsPageClient.tsx` was refactored to use `t()` via `getDefaultFaqSeed(t)`, `getAlwaysTransferOptions(t)`, `templateGreeting(id, t)`, `defaultAgent(t)`, `getFaqCategoryTabs(t)`, `getDefaultObjections(t)`. But the keys DON'T EXIST in locale files.

**Add to `agents` namespace in ALL 6 locale files:**

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

Translate ALL of these properly into es, fr, de, pt, ja.

---

## PART 4 — REMAINING COMPONENT i18n FIXES

### 4A. `src/components/LiveAgentChat.tsx`
The `AGENTS` const (lines 11-46) has hardcoded name/greeting strings. Refactor to function `getAgents(t)`:

```tsx
function getAgents(t: (k: string) => string): Record<AgentId, {...}> {
  return {
    sarah: { id: "sarah", name: t("liveChat.agents.professional.name"), initials: "P", pill: t("liveChat.agents.professional.name"), avatarBg: "bg-zinc-600/30 text-zinc-300 border-zinc-500/30", greeting: t("liveChat.agents.professional.greeting") },
    alex: { id: "alex", name: t("liveChat.agents.friendly.name"), initials: "F", pill: t("liveChat.agents.friendly.name"), avatarBg: "bg-zinc-600/30 text-zinc-300 border-zinc-500/30", greeting: t("liveChat.agents.friendly.greeting") },
    emma: { id: "emma", name: t("liveChat.agents.concise.name"), initials: "C", pill: t("liveChat.agents.concise.name"), avatarBg: "bg-zinc-600/30 text-zinc-300 border-zinc-500/30", greeting: t("liveChat.agents.concise.greeting") },
  };
}
```

Call inside component where `t` is available. Add keys to `messages.liveChat.agents` namespace in all 6 locale files.

### 4B. `src/components/ErrorBoundary.tsx`
A `TranslatedErrorBoundary` wrapper has already been added. Now verify that ALL usages of `<ErrorBoundary>` in the codebase are replaced with `<TranslatedErrorBoundary>` where inside a next-intl provider context. Search for `<ErrorBoundary` and update.

Add these keys to `errors` namespace if missing:
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

---

## PART 5 — ACTIVATE PAGE MIXED LANGUAGE

### `src/app/activate/ActivateWizard.tsx` (or equivalent)
The live site shows the activate page with mixed English/Spanish:
- Step labels in English: "Step 1 of 5", "Business", "Agent", "Customize", "Test", "Activate"
- Checkbox labels in English: "Answer incoming calls", "Book appointments", "Follow up with leads", "Handle after-hours calls"

Find these strings and ensure they use `t()` calls with keys that exist in all locale files.

---

## VERIFICATION

```bash
# Footer keys exist in all locales
python3 -c "
import json
for lang in ['en','es','fr','de','pt','ja']:
    data = json.load(open(f'src/i18n/messages/{lang}.json'))
    footer = data.get('footer', {})
    missing = [k for k in ['tagline','product','features','pricing','demo','docs','company','emailUs','blog','contact','legalSecurity','privacyPolicy','termsOfService','securityBadges'] if k not in footer]
    print(f'{lang}: {\"CLEAN\" if not missing else f\"MISSING: {missing}\"}')
"

# Agent keys exist
python3 -c "
import json
data = json.load(open('src/i18n/messages/en.json'))
agents = data.get('agents', {})
for k in ['defaultFaq','defaultTransfer','templateGreeting','defaultAgent','faqCategories','defaultObjections']:
    print(f'agents.{k}: {\"OK\" if k in agents else \"MISSING\"} ({len(agents.get(k,{}))} keys)')
"

# Homepage sections use useTranslations
grep -rL 'useTranslations' src/components/sections/*.tsx
# Should return EMPTY (all files use it)

# No raw footer keys
grep -n 't("tagline")' src/components/sections/Footer.tsx
# Should show it's called, and locale files should have the key

# TypeScript check
npx tsc --noEmit

# Build
npm run build

# Commit
git add -A && git commit -m "fix: complete i18n — footer keys, homepage sections, agent locale keys, LiveAgentChat, ErrorBoundary" && git push origin main
git log --oneline -3
```

Paste ONLY the git log output.
