"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Code, Shield, Plug, HelpCircle, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { DocCodeBlock } from "@/components/docs/DocCodeBlock";
import { DocFeedback } from "@/components/docs/DocFeedback";
import { DocSearch } from "@/components/docs/DocSearch";

const DOC_SIDEBAR = [
  { id: "quick-start", label: "Quick Start" },
  { id: "call-forwarding", label: "Call Forwarding" },
  { id: "ai-agents", label: "Agent Config" },
  { id: "campaigns", label: "Campaigns" },
  { id: "integrations", label: "Integrations" },
  { id: "billing", label: "Billing" },
  { id: "api", label: "API" },
  { id: "sdk", label: "SDK Examples" },
  { id: "changelog", label: "Changelog" },
  { id: "faq", label: "FAQ" },
] as const;

const DOC_CARDS = [
  { icon: BookOpen, title: "Getting Started", desc: "Set up your AI phone system in minutes.", href: "#quick-start" },
  { icon: Code, title: "API Reference", desc: "Integrate Recall Touch into your existing systems.", href: "#api" },
  { icon: Shield, title: "Compliance Framework", desc: "Configure recording consent, retention, and regional rules.", href: "/compliance" },
  { icon: Plug, title: "Integrations", desc: "Connect Recall Touch with your existing sales and communication tools.", href: null },
  { icon: HelpCircle, title: "FAQ", desc: "Common questions about setup, calls, and billing.", href: `${ROUTES.PRICING}#faq` },
  { icon: MessageCircle, title: "Contact Support", desc: "Talk to our team for technical or compliance questions.", href: ROUTES.CONTACT },
] as const;

const SECTION_KEYWORDS: Record<string, string> = {
  "quick-start": "quick start setup sign up business agent phone test call 5 minute",
  "call-forwarding": "call forwarding number carrier att verizon t-mobile",
  "ai-agents": "ai agents voice greeting configure",
  "campaigns": "campaigns outbound follow-up reminders",
  "integrations": "integrations zapier make webhooks api",
  "billing": "billing pricing plans invoice",
  "api": "api rest endpoint authentication lead workspace",
  "sdk": "sdk curl javascript python example lead create",
  "changelog": "changelog updates release",
  "faq": "faq questions",
};

export default function DocsPageContent() {
  const t = useTranslations("docs");
  const [searchQuery, setSearchQuery] = useState("");

  const filterSection = useCallback(
    (sectionId: string) => {
      if (!searchQuery.trim()) return true;
      const keywords = SECTION_KEYWORDS[sectionId] ?? "";
      return keywords.toLowerCase().includes(searchQuery.toLowerCase());
    },
    [searchQuery]
  );

  const visibleSections = useMemo(
    () => DOC_SIDEBAR.filter((s) => filterSection(s.id)),
    [filterSection]
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="flex flex-col lg:flex-row gap-12">
            <aside className="lg:w-56 shrink-0">
              <div className="sticky top-24 space-y-4">
                <DocSearch onSearch={setSearchQuery} placeholder={t("search.placeholder")} />
                <nav className="space-y-1" aria-label="Documentation">
                  {(searchQuery.trim() ? visibleSections : DOC_SIDEBAR).map(({ id, label }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className="block py-1.5 text-sm rounded-md px-2 -ml-2 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
            <div className="min-w-0 flex-1 max-w-3xl">
              <div className="max-w-2xl mb-16">
                <p className="section-label mb-4">Documentation</p>
                <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  Documentation
                </h1>
                <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Step-by-step guides for forwarding your number, setting up your voice agent, and connecting Recall Touch to the tools your business already uses.
                </p>
              </div>

              {/* Quick Start — 5-minute flow */}
              <section
                id="quick-start"
                className="scroll-mt-28 mb-12 doc-section"
                data-keywords={SECTION_KEYWORDS["quick-start"]}
                style={{ display: filterSection("quick-start") ? undefined : "none" }}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>
                  Quick Start
                </h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Set up Recall Touch in about 5 minutes: sign up, add your business details, configure your AI agent, connect your phone number, and place a test call.
                </p>
                <ol className="list-decimal list-inside space-y-3 text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  <li><strong className="text-[var(--text-primary)]">Sign up</strong> — Go to Start free and create your account.</li>
                  <li><strong className="text-[var(--text-primary)]">Business details</strong> — Enter business name, address, and phone.</li>
                  <li><strong className="text-[var(--text-primary)]">AI agent</strong> — Choose a template (Receptionist, Appointment Setter, etc.) and customize greeting and voice.</li>
                  <li><strong className="text-[var(--text-primary)]">Phone number</strong> — Add or verify your Recall Touch number; forward your existing number to it if needed.</li>
                  <li><strong className="text-[var(--text-primary)]">Test call</strong> — Use the Test tab on the Agents page to place a real call and confirm everything works.</li>
                </ol>
                <Link href={ROUTES.START} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
                  Start free →
                </Link>
                <DocFeedback sectionId="quick-start" />
              </section>

              {/* Call Forwarding */}
              <section
                id="call-forwarding"
                className="scroll-mt-28 mb-12 pt-8 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("call-forwarding") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["call-forwarding"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>
                  Call Forwarding
                </h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Forward your existing business number to your Recall Touch number, or use the provisioned number as your primary line. Incoming calls are answered by your agent 24/7.
                </p>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Carrier-specific steps</p>
                <ul className="text-sm space-y-2 mb-4 list-disc pl-5" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  <li><strong>AT&amp;T:</strong> Dial <code className="px-1 rounded bg-black/10">*21*[your RT number]#</code> then call. To cancel: <code className="px-1 rounded bg-black/10">#21#</code></li>
                  <li><strong>Verizon:</strong> Dial <code className="px-1 rounded bg-black/10">*72</code> then your Recall Touch number. To cancel: <code className="px-1 rounded bg-black/10">*73</code></li>
                  <li><strong>T-Mobile:</strong> Dial <code className="px-1 rounded bg-black/10">**21*[RT number]#</code>. To cancel: <code className="px-1 rounded bg-black/10">##21#</code></li>
                  <li><strong>Comcast Business:</strong> Voice → Call Forwarding → enter your Recall Touch number.</li>
                  <li><strong>Google Voice:</strong> Settings → Calls → forward to your RT number.</li>
                </ul>
                <DocFeedback sectionId="call-forwarding" />
              </section>

              {/* AI Agents */}
              <section
                id="ai-agents"
                className="scroll-mt-28 mb-12 pt-8 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("ai-agents") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["ai-agents"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>AI Agents</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Configure your AI agent name, voice, greeting, and capabilities. Teach it your services, hours, and how to handle appointments. No coding required.
                </p>
                <DocFeedback sectionId="ai-agents" />
              </section>

              {/* Campaigns */}
              <section
                id="campaigns"
                className="scroll-mt-28 mb-12 pt-8 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("campaigns") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["campaigns"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Campaigns</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Run outbound follow-up, reminders, and recovery flows. Create campaigns from the dashboard, set audiences and scripts, and track outcomes.
                </p>
                <DocFeedback sectionId="campaigns" />
              </section>

              {/* Integrations */}
              <section
                id="integrations"
                className="scroll-mt-28 mb-12 pt-8 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("integrations") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["integrations"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Integrations</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Connect Recall Touch with your phone provider (Twilio), calendar, and CRM. Webhooks and API access available on Scale and Enterprise plans.
                </p>
                <h3 className="font-semibold text-lg mt-6 mb-2" style={{ color: "var(--text-primary)" }}>Zapier & Make</h3>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Use OAuth to connect your Recall Touch workspace, then poll triggers or invoke actions.
                </p>
                <ul className="text-sm mb-2 list-disc pl-5 space-y-1" style={{ color: "var(--text-secondary)" }}>
                  <li><strong>Authorize:</strong> GET /api/integrations/zapier/oauth/authorize?redirect_uri=...&state=...</li>
                  <li><strong>Token:</strong> POST /api/integrations/zapier/oauth/token (body: code, client_id, client_secret, redirect_uri, grant_type=authorization_code)</li>
                </ul>
                <p className="text-xs font-medium mt-3 mb-1" style={{ color: "var(--text-primary)" }}>Triggers (GET, Bearer token)</p>
                <ul className="text-sm list-disc pl-5 space-y-0.5 mb-3" style={{ color: "var(--text-secondary)" }}>
                  <li>new_call — /api/integrations/zapier/triggers/new_call</li>
                  <li>new_lead — /api/integrations/zapier/triggers/new_lead</li>
                  <li>new_appointment — /api/integrations/zapier/triggers/new_appointment</li>
                  <li>call_completed — /api/integrations/zapier/triggers/call_completed</li>
                </ul>
                <p className="text-xs font-medium mt-3 mb-1" style={{ color: "var(--text-primary)" }}>Actions (POST, Bearer token)</p>
                <ul className="text-sm list-disc pl-5 space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                  <li>create_lead — /api/integrations/zapier/actions/create_lead (name, phone, email?, company?)</li>
                  <li>update_lead — /api/integrations/zapier/actions/update_lead (id, name?, phone?, email?, company?, state?)</li>
                  <li>trigger_campaign — /api/integrations/zapier/actions/trigger_campaign (campaign_id, lead_id)</li>
                  <li>create_appointment — /api/integrations/zapier/actions/create_appointment (lead_id, title, start_time, end_time?, location?, notes?)</li>
                </ul>
                <DocFeedback sectionId="integrations" />
              </section>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
                {DOC_CARDS.map((card) => (
                  <div key={card.title} className="card-marketing p-6 flex flex-col">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{card.title}</h2>
                    <p className="text-sm flex-1 mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>{card.desc}</p>
                    {card.href ? (
                      <Link href={card.href} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>View →</Link>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full inline-block w-fit" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>Contact for access</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Billing */}
              <section
                id="billing"
                className="scroll-mt-28 mt-16 pt-12 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("billing") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["billing"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Billing</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Plans are billed monthly or annually. Annual billing includes two months free. You can change or cancel from Settings → Billing. Invoices are available in the dashboard.
                </p>
                <Link href={ROUTES.PRICING} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>View pricing →</Link>
                <DocFeedback sectionId="billing" />
              </section>

              {/* API Reference */}
              <section
                id="api"
                className="scroll-mt-28 mt-16 pt-12 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("api") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["api"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>API Reference</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  REST API for integrating Recall Touch. All endpoints require a valid session (cookie) or Bearer token. Base URL: <code className="px-1 rounded bg-black/10">https://your-domain.com</code>.
                </p>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>GET /api/workspace/me</h3>
                    <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Returns current workspace and user. Auth: required (session or Bearer).</p>
                    <DocCodeBlock language="bash" title="Example: curl" code={`curl -X GET "https://your-domain.com/api/workspace/me" \\
  -H "Cookie: revenue_session=..." \\
  -H "Accept: application/json"`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>GET /api/leads</h3>
                    <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>List leads for the workspace. Auth: required. Query: limit, offset, state.</p>
                    <DocCodeBlock language="bash" title="Example: curl" code={`curl -X GET "https://your-domain.com/api/leads?limit=10" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Accept: application/json"`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>POST /api/leads</h3>
                    <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Create a lead. Auth: required. Body: name, phone, email?, company?.</p>
                    <DocCodeBlock language="json" title="Request body" code={`{
  "name": "Jane Smith",
  "phone": "+15551234567",
  "email": "jane@example.com",
  "company": "Acme Inc"
}`} />
                  </div>
                </div>
                <Link href={ROUTES.CONTACT} className="text-sm font-medium mt-4 inline-block" style={{ color: "var(--accent-primary)" }}>Contact for full API access →</Link>
                <DocFeedback sectionId="api" />
              </section>

              {/* SDK Examples */}
              <section
                id="sdk"
                className="scroll-mt-28 mt-16 pt-12 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("sdk") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["sdk"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>SDK Examples</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Common operations in curl, JavaScript, and Python.
                </p>
                <h3 className="font-semibold text-lg mt-6 mb-2" style={{ color: "var(--text-primary)" }}>Create a lead</h3>
                <DocCodeBlock language="bash" title="curl" code={`curl -X POST "https://your-domain.com/api/leads" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Jane Smith","phone":"+15551234567","email":"jane@example.com"}'`} />
                <DocCodeBlock language="javascript" title="JavaScript (fetch)" code={`const res = await fetch("https://your-domain.com/api/leads", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Jane Smith",
    phone: "+15551234567",
    email: "jane@example.com",
  }),
});
const lead = await res.json();`} />
                <DocCodeBlock language="python" title="Python (requests)" code={`import requests

resp = requests.post(
    "https://your-domain.com/api/leads",
    headers={
        "Authorization": "Bearer YOUR_TOKEN",
        "Content-Type": "application/json",
    },
    json={
        "name": "Jane Smith",
        "phone": "+15551234567",
        "email": "jane@example.com",
    },
)
lead = resp.json()`} />
                <DocFeedback sectionId="sdk" />
              </section>

              {/* Changelog */}
              <section
                id="changelog"
                className="scroll-mt-28 mt-16 pt-12 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("changelog") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["changelog"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Changelog</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Recent platform updates.
                </p>
                <ul className="text-sm space-y-3 list-none pl-0" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <li><strong className="text-[var(--text-primary)]">2025-03</strong> — Campaign sequences (Call, SMS, Email, Wait), lead scoring, notification center, onboarding checklist, error reporting, SEO and accessibility improvements.</li>
                  <li><strong className="text-[var(--text-primary)]">2025-02</strong> — Vapi voice agents, Twilio phone provisioning, activity and inbox views, settings hub.</li>
                  <li><strong className="text-[var(--text-primary)]">2025-01</strong> — Initial launch: workspace setup, sign-in, pricing, demo simulator.</li>
                </ul>
                <DocFeedback sectionId="changelog" />
              </section>

              {/* FAQ */}
              <section
                id="faq"
                className="scroll-mt-28 mt-16 pt-12 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("faq") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["faq"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>FAQ</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Common questions about setup, call forwarding, agents, and billing are answered on the pricing page.
                </p>
                <Link href={`${ROUTES.PRICING}#faq`} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>View FAQ →</Link>
                <DocFeedback sectionId="faq" />
              </section>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
