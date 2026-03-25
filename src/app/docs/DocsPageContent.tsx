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

function getDocSidebar(t: (key: string) => string) {
  return [
    { id: "quick-start", label: t("sidebar.quickStart") },
    { id: "call-forwarding", label: t("sidebar.callForwarding") },
    { id: "ai-agents", label: t("sidebar.agentConfig") },
    { id: "campaigns", label: t("sidebar.campaigns") },
    { id: "integrations", label: t("sidebar.integrations") },
    { id: "billing", label: t("sidebar.billing") },
    { id: "api", label: t("sidebar.api") },
    { id: "sdk", label: t("sidebar.sdkExamples") },
    { id: "changelog", label: t("sidebar.changelog") },
    { id: "faq", label: t("sidebar.faq") },
  ];
}

function getDocCards(t: (key: string) => string) {
  return [
    { icon: BookOpen, title: t("cards.gettingStarted.title"), desc: t("cards.gettingStarted.desc"), href: "#quick-start" },
    { icon: Code, title: t("cards.apiReference.title"), desc: t("cards.apiReference.desc"), href: "#api" },
    { icon: Shield, title: t("cards.compliance.title"), desc: t("cards.compliance.desc"), href: "/compliance" },
    { icon: Plug, title: t("cards.integrations.title"), desc: t("cards.integrations.desc"), href: null },
    { icon: HelpCircle, title: t("cards.faq.title"), desc: t("cards.faq.desc"), href: `${ROUTES.PRICING}#faq` },
    { icon: MessageCircle, title: t("cards.support.title"), desc: t("cards.support.desc"), href: ROUTES.CONTACT },
  ];
}

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

  const docSidebar = useMemo(() => getDocSidebar(t), [t]);
  const docCards = useMemo(() => getDocCards(t), [t]);
  const visibleSections = useMemo(
    () => docSidebar.filter((s) => filterSection(s.id)),
    [docSidebar, filterSection]
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
                  {(searchQuery.trim() ? visibleSections : docSidebar).map(({ id, label }: { id: string; label: string }) => (
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
                <p className="section-label mb-4">{t("title")}</p>
                <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {t("title")}
                </h1>
                <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("description")}
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
                  {t("sections.quickStart.title")}
                </h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.quickStart.description")}
                </p>
                <ol className="list-decimal list-inside space-y-3 text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  <li><strong className="text-[var(--text-primary)]">{t("sections.quickStart.step1Label")}</strong> — {t("sections.quickStart.step1")}</li>
                  <li><strong className="text-[var(--text-primary)]">{t("sections.quickStart.step2Label")}</strong> — {t("sections.quickStart.step2")}</li>
                  <li><strong className="text-[var(--text-primary)]">{t("sections.quickStart.step3Label")}</strong> — {t("sections.quickStart.step3")}</li>
                  <li><strong className="text-[var(--text-primary)]">{t("sections.quickStart.step4Label")}</strong> — {t("sections.quickStart.step4")}</li>
                  <li><strong className="text-[var(--text-primary)]">{t("sections.quickStart.step5Label")}</strong> — {t("sections.quickStart.step5")}</li>
                </ol>
                <Link href={ROUTES.START} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
                  {t("sections.quickStart.cta")}
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
                  {t("sections.callForwarding.title")}
                </h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.callForwarding.description")}
                </p>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>{t("sections.callForwarding.carrierSteps")}</p>
                <ul className="text-sm space-y-2 mb-4 list-disc pl-5" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  <li><strong>AT&amp;T:</strong> {t("sections.callForwarding.att")}</li>
                  <li><strong>Verizon:</strong> {t("sections.callForwarding.verizon")}</li>
                  <li><strong>T-Mobile:</strong> {t("sections.callForwarding.tmobile")}</li>
                  <li><strong>Comcast Business:</strong> {t("sections.callForwarding.comcast")}</li>
                  <li><strong>Google Voice:</strong> {t("sections.callForwarding.googleVoice")}</li>
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
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.aiAgents.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.aiAgents.description")}
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
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.campaigns.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.campaigns.description")}
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
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.integrations.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.integrations.description")}
                </p>
                <h3 className="font-semibold text-lg mt-6 mb-2" style={{ color: "var(--text-primary)" }}>{t("sections.integrations.zapierHeading")}</h3>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {t("sections.integrations.zapierDesc")}
                </p>
                <ul className="text-sm mb-2 list-disc pl-5 space-y-1" style={{ color: "var(--text-secondary)" }}>
                  <li><strong>{t("sections.integrations.authorizeLabel")}:</strong> GET /api/integrations/zapier/oauth/authorize?redirect_uri=...&state=...</li>
                  <li><strong>{t("sections.integrations.tokenLabel")}:</strong> POST /api/integrations/zapier/oauth/token (body: code, client_id, client_secret, redirect_uri, grant_type=authorization_code)</li>
                </ul>
                <p className="text-xs font-medium mt-3 mb-1" style={{ color: "var(--text-primary)" }}>{t("sections.integrations.triggersHeading")}</p>
                <ul className="text-sm list-disc pl-5 space-y-0.5 mb-3" style={{ color: "var(--text-secondary)" }}>
                  <li>new_call — /api/integrations/zapier/triggers/new_call</li>
                  <li>new_lead — /api/integrations/zapier/triggers/new_lead</li>
                  <li>new_appointment — /api/integrations/zapier/triggers/new_appointment</li>
                  <li>call_completed — /api/integrations/zapier/triggers/call_completed</li>
                </ul>
                <p className="text-xs font-medium mt-3 mb-1" style={{ color: "var(--text-primary)" }}>{t("sections.integrations.actionsHeading")}</p>
                <ul className="text-sm list-disc pl-5 space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                  <li>create_lead — /api/integrations/zapier/actions/create_lead (name, phone, email?, company?)</li>
                  <li>update_lead — /api/integrations/zapier/actions/update_lead (id, name?, phone?, email?, company?, state?)</li>
                  <li>trigger_campaign — /api/integrations/zapier/actions/trigger_campaign (campaign_id, lead_id)</li>
                  <li>create_appointment — /api/integrations/zapier/actions/create_appointment (lead_id, title, start_time, end_time?, location?, notes?)</li>
                </ul>
                <DocFeedback sectionId="integrations" />
              </section>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
                {docCards.map((card) => (
                  <div key={card.title} className="card-marketing p-6 flex flex-col">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{card.title}</h2>
                    <p className="text-sm flex-1 mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>{card.desc}</p>
                    {card.href ? (
                      <Link href={card.href} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{t("cards.viewLink")}</Link>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full inline-block w-fit" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>{t("cards.contactForAccess")}</span>
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
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.billing.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.billing.description")}
                </p>
                <Link href={ROUTES.PRICING} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{t("sections.billing.cta")}</Link>
                <DocFeedback sectionId="billing" />
              </section>

              {/* API Reference */}
              <section
                id="api"
                className="scroll-mt-28 mt-16 pt-12 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("api") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["api"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.api.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.api.description")}
                </p>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>GET /api/workspace/me</h3>
                    <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("sections.api.workspaceMeDesc")}</p>
                    <DocCodeBlock language="bash" title={t("sections.api.exampleCurl")} code={`curl -X GET "https://your-domain.com/api/workspace/me" \\
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
                    <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("sections.api.leadsCreateDesc")}</p>
                    <DocCodeBlock language="json" title={t("sections.api.requestBody")} code={`{
  "name": "Jane Smith",
  "phone": "+15551234567",
  "email": "jane@example.com",
  "company": "Acme Inc"
}`} />
                  </div>
                </div>
                <Link href={ROUTES.CONTACT} className="text-sm font-medium mt-4 inline-block" style={{ color: "var(--accent-primary)" }}>{t("sections.api.contactCta")}</Link>
                <DocFeedback sectionId="api" />
              </section>

              {/* SDK Examples */}
              <section
                id="sdk"
                className="scroll-mt-28 mt-16 pt-12 border-t doc-section"
                style={{ borderColor: "var(--border-default)", display: filterSection("sdk") ? undefined : "none" }}
                data-keywords={SECTION_KEYWORDS["sdk"]}
              >
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.sdk.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.sdk.description")}
                </p>
                <h3 className="font-semibold text-lg mt-6 mb-2" style={{ color: "var(--text-primary)" }}>{t("sections.sdk.createLeadHeading")}</h3>
                <DocCodeBlock language="bash" title={t("sections.sdk.curlTitle")} code={`curl -X POST "https://your-domain.com/api/leads" \\
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
                <DocCodeBlock language="python" title={t("sections.sdk.pythonTitle")} code={`import requests

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
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.changelog.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.changelog.description")}
                </p>
                <ul className="text-sm space-y-3 list-none pl-0" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <li><strong className="text-[var(--text-primary)]">2025-03</strong> — {t("sections.changelog.entry202503")}</li>
                  <li><strong className="text-[var(--text-primary)]">2025-02</strong> — {t("sections.changelog.entry202502")}</li>
                  <li><strong className="text-[var(--text-primary)]">2025-01</strong> — {t("sections.changelog.entry202501")}</li>
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
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>{t("sections.faq.title")}</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("sections.faq.description")}
                </p>
                <Link href={`${ROUTES.PRICING}#faq`} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>{t("sections.faq.cta")}</Link>
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
