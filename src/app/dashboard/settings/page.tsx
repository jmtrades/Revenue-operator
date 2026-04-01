"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, Card, CardHeader, CardBody, EmptyState } from "@/components/ui";

export default function SettingsPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [callAwareEnabled, setCallAwareEnabled] = useState(true);
  const [communicationStyle, setCommunicationStyle] = useState<"direct" | "consultative">("consultative");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [zoomHealth, setZoomHealth] = useState<{ connected: boolean; token_valid?: boolean } | null>(null);
  const [zoomDisconnecting, setZoomDisconnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [billingStatus, setBillingStatus] = useState<{ billing_status?: string; renewal_at?: string | null } | null>(null);
  const [coverageFlags, setCoverageFlags] = useState({
    continuity_messaging: true,
    booking_protection: true,
    attendance_protection: true,
    post_call_continuity: true,
    notifications: true,
  });
  const [showBusinessContext, setShowBusinessContext] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [inboundWebhookUrl, setInboundWebhookUrl] = useState("");
  const [teamHandoffEmails, setTeamHandoffEmails] = useState("");
  const [absenceStatements, setAbsenceStatements] = useState<{
    what_would_fail: string[];
    recent_operation: string[];
    current_dependency: string[];
    if_disabled: string[];
  } | null>(null);
  const [disconnectStatements, setDisconnectStatements] = useState<string[] | null>(null);
  const [operationalProfile, setOperationalProfile] = useState<string>("org");
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [businessContext, setBusinessContext] = useState({
    business_name: "",
    offer_summary: "",
    ideal_customer: "",
    disqualifiers: "",
    pricing_range: "",
    booking_link: "",
    faq: [] as Array<{ q: string; a: string }>,
    tone_guidelines: { style: "calm", formality: "professional" },
    compliance_notes: [] as string[],
    timezone: "UTC",
    business_hours: {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
    },
    negotiation_rules: {
      discounts_allowed: false,
      deposit_required: false,
      payment_terms: null as string | null,
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/${workspaceId}/settings`)
      .then((r) => r.json())
      .then((d) => {
        setPreviewMode(d.preview_mode ?? false);
        setEscalationEnabled(d.escalation_rules?.enabled ?? false);
        setCallAwareEnabled(d.call_aware_enabled ?? true);
        const th = d.team_handoff_emails;
        setTeamHandoffEmails(Array.isArray(th) ? (th as string[]).join(", ") : typeof th === "string" ? th : "");
        const style = d.communication_style;
        setCommunicationStyle(style === "direct" ? "direct" : "consultative");
        const cf = d.coverage_flags;
        if (cf && typeof cf === "object") {
          setCoverageFlags({
            continuity_messaging: cf.continuity_messaging !== false,
            booking_protection: cf.booking_protection !== false,
            attendance_protection: cf.attendance_protection !== false,
            post_call_continuity: cf.post_call_continuity !== false,
            notifications: cf.notifications !== false,
          });
        }
        const op = d.operational_profile;
        if (typeof op === "string" && ["org", "solo", "creator", "vendor", "recruiting", "legal", "customer_success"].includes(op)) {
          setOperationalProfile(op);
        }
      })
      .catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
    fetch(`/api/workspaces/${workspaceId}/webhook-config`)
      .then((r) => r.ok ? r.json() : Promise.resolve({ endpoint_url: "" }))
      .then((d: { endpoint_url?: string }) => setWebhookUrl(d?.endpoint_url ?? ""))
      .catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
    fetch(`/api/workspaces/${workspaceId}/zoom/health`)
      .then((r) => r.ok ? r.json() : Promise.resolve({ connected: false }))
      .then(setZoomHealth)
      .catch(() => setZoomHealth({ connected: false }));
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.ok ? r.json() : Promise.resolve(null))
      .then((d: { error?: string; renewal_at?: string | null; billing_status?: string } | null) =>
        d?.error ? null : setBillingStatus(d)
      )
      .catch(() => setBillingStatus(null));
    fetch(`/api/workspaces/${workspaceId}/business-context`)
      .then((r) => r.ok ? r.json() : Promise.resolve(null))
      .then((d) => {
        if (d && !d.error) {
          setBusinessContext({
            business_name: d.business_name ?? "",
            offer_summary: d.offer_summary ?? "",
            ideal_customer: d.ideal_customer ?? "",
            disqualifiers: d.disqualifiers ?? "",
            pricing_range: d.pricing_range ?? "",
            booking_link: d.booking_link ?? "",
            faq: Array.isArray(d.faq) ? d.faq : [],
            tone_guidelines: d.tone_guidelines ?? { style: "calm", formality: "professional" },
            compliance_notes: Array.isArray(d.compliance_notes) ? d.compliance_notes : [],
            timezone: d.timezone ?? "UTC",
            business_hours: d.business_hours ?? {
              monday: { start: "09:00", end: "17:00" },
              tuesday: { start: "09:00", end: "17:00" },
              wednesday: { start: "09:00", end: "17:00" },
              thursday: { start: "09:00", end: "17:00" },
              friday: { start: "09:00", end: "17:00" },
            },
            negotiation_rules: d.negotiation_rules ?? {
              discounts_allowed: false,
              deposit_required: false,
              payment_terms: null,
            },
          });
        }
      })
      .catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
    // Fetch active phone number
    fetch("/api/integrations/twilio/auto-provision", { method: "POST" })
      .then((r) => r.ok ? r.json() : Promise.resolve(null))
      .then((d: { phone_number?: string } | null) => {
        if (d?.phone_number) {
          setActivePhone(d.phone_number);
        }
      })
      .catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
    // Build inbound webhook URL
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    if (baseUrl && workspaceId) {
      setInboundWebhookUrl(`${baseUrl}/api/webhooks/inbound-generic?workspace_id=${encodeURIComponent(workspaceId)}`);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { session?: { email?: string } | null }) => setSessionEmail(d?.session?.email ?? null))
      .catch(() => setSessionEmail(null));
  }, []);

  const save = async () => {
    if (!workspaceId) return;
    const _res = await fetch(`/api/workspaces/${workspaceId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preview_mode: previewMode,
        escalation_rules: { enabled: escalationEnabled },
        call_aware_enabled: callAwareEnabled,
        communication_style: communicationStyle,
        coverage_flags: coverageFlags,
        team_handoff_emails: teamHandoffEmails.split(",").map((e) => e.trim()).filter(Boolean),
      }),
    });
    if (webhookUrl) {
      await fetch(`/api/workspaces/${workspaceId}/webhook-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint_url: webhookUrl }),
      });
    }
    // Save business context
    await fetch(`/api/workspaces/${workspaceId}/business-context`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...businessContext,
        pricing_range: businessContext.pricing_range || null,
        booking_link: businessContext.booking_link || null,
      }),
    }).catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
  };

  const settingsLinks = useMemo(
    () => [
      { href: "/dashboard/settings/business", label: t("settings.nav.business") },
      { href: "/dashboard/settings/phone", label: t("settings.nav.phone") },
      { href: "/dashboard/settings/call-rules", label: t("settings.nav.callRules") },
      { href: "/dashboard/settings/team", label: t("settings.nav.team") },
      { href: "/dashboard/settings/notifications", label: t("settings.nav.notifications") },
      { href: "/dashboard/settings/integrations", label: t("settings.nav.integrations") },
      { href: "/dashboard/settings/compliance", label: t("settings.nav.compliance") },
      { href: "/dashboard/settings/billing", label: t("settings.nav.billing") },
    ],
    [t]
  );
  const q = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";

  return (
    <div className="p-8 max-w-xl mx-auto" style={{ color: "var(--text-primary)" }}>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href={workspaceId ? `/dashboard/presence?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard/presence"} style={{ color: "var(--meaning-blue)" }}>{t("settings.presence")}</Link>
      </p>
      <PageHeader title={t("settings.pageTitle")} subtitle={t("settings.pageSubtitle")} />
      <nav className="mb-8 flex flex-wrap gap-2" aria-label={t("settings.sectionsAria")}>
        {settingsLinks.map(({ href, label }) => (
          <Link key={href} href={href + q} className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--surface)" }}>
            {label}
          </Link>
        ))}
      </nav>
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{t("settings.generalPreferences")}</h2>
      {!workspaceId ? (
        <EmptyState title={t("followThroughEmptyTitle")} subtitle={t("followThroughEmptySubtitle")} icon="watch" />
      ) : (
        <div className="space-y-6">
          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.operatingProfile")}</h2>
            <select
              value={operationalProfile}
              onChange={(e) => {
                const v = e.target.value as "org" | "solo" | "creator" | "vendor" | "recruiting" | "legal" | "customer_success";
                setOperationalProfile(v);
                fetch(`/api/workspaces/${workspaceId}/settings`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ operational_profile: v }),
                }).catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
              }}
              className="w-full max-w-xs text-sm py-2 px-3 border rounded focus-ring"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <option value="org">{t("settings.operatingProfileOrg")}</option>
              <option value="solo">{t("settings.operatingProfileSolo")}</option>
              <option value="creator">{t("settings.operatingProfileCreator")}</option>
              <option value="vendor">{t("settings.operatingProfileVendor")}</option>
              <option value="recruiting">{t("settings.operatingProfileRecruiting")}</option>
              <option value="legal">{t("settings.operatingProfileLegal")}</option>
              <option value="customer_success">{t("settings.operatingProfileCustomerSuccess")}</option>
            </select>
          </section>
          {sessionEmail && (
            <Card>
              <CardHeader>{t("settings.account")}</CardHeader>
              <CardBody>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("settings.signedInAs")} <span style={{ color: "var(--text-primary)" }}>{sessionEmail}</span>
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                    router.replace("/activate");
                  }}
                  className="mt-2 text-sm font-medium"
                  style={{ color: "var(--meaning-blue)" }}
                >
                  {t("settings.logOut")}
                </button>
              </CardBody>
            </Card>
          )}
          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.businessContext")}</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              {t("settings.businessContextIntro")}
            </p>
            <button
              type="button"
              onClick={() => setShowBusinessContext(!showBusinessContext)}
              className="text-sm mb-3"
              style={{ color: "var(--meaning-blue)" }}
            >
              {showBusinessContext ? "−" : "+"} {showBusinessContext ? t("settings.hideBusinessContext") : t("settings.showBusinessContext")}
            </button>
            {showBusinessContext && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.businessName")}</label>
                  <input
                    type="text"
                    value={businessContext.business_name}
                    onChange={(e) => setBusinessContext({ ...businessContext, business_name: e.target.value })}
                    placeholder={t("settings.businessNamePlaceholder")}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.whatYouOffer")}</label>
                  <textarea
                    value={businessContext.offer_summary}
                    onChange={(e) => setBusinessContext({ ...businessContext, offer_summary: e.target.value })}
                    placeholder={t("settings.whatYouOfferPlaceholder")}
                    rows={2}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.idealCustomer")}</label>
                  <input
                    type="text"
                    value={businessContext.ideal_customer}
                    onChange={(e) => setBusinessContext({ ...businessContext, ideal_customer: e.target.value })}
                    placeholder={t("settings.idealCustomerPlaceholder")}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.pricingOptional")}</label>
                  <input
                    type="text"
                    value={businessContext.pricing_range}
                    onChange={(e) => setBusinessContext({ ...businessContext, pricing_range: e.target.value })}
                    placeholder={t("settings.pricingPlaceholder")}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    {t("settings.bookingLink")} <span style={{ color: "var(--text-muted)" }}>{t("settings.bookingLinkRecommended")}</span>
                  </label>
                  <input
                    type="url"
                    value={businessContext.booking_link}
                    onChange={(e) => setBusinessContext({ ...businessContext, booking_link: e.target.value })}
                    placeholder={t("settings.bookingLinkPlaceholder")}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="discounts_allowed"
                    checked={businessContext.negotiation_rules.discounts_allowed}
                    onChange={(e) =>
                      setBusinessContext({
                        ...businessContext,
                        negotiation_rules: { ...businessContext.negotiation_rules, discounts_allowed: e.target.checked },
                      })
                    }
                    className="rounded"
                    style={{ accentColor: "var(--meaning-blue)" }}
                  />
                  <label htmlFor="discounts_allowed" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {t("settings.allowDiscountsInNegotiations")}
                  </label>
                </div>
              </div>
            )}
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.sources")}</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              {t("settings.sourcesIntro")}
            </p>
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className="text-sm mb-3"
              style={{ color: "var(--meaning-blue)" }}
            >
              {showSources ? "−" : "+"} {showSources ? t("settings.hideSources") : t("settings.showSources")}
            </button>
            {showSources && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>SMS</label>
                  {activePhone ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{activePhone}</p>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>{t("settings.inPlace")}</span>
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("settings.notInPlace")}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.email")}</label>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("settings.notConfigured")}</p>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.inboundAddress")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inboundWebhookUrl}
                      className="flex-1 px-3 py-2 rounded text-xs font-mono"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inboundWebhookUrl);
                      }}
                      className="px-3 py-2 rounded text-xs"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                    >
                      {t("settings.copy")}
                    </button>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                    {t("settings.externalSourcesHint")}
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>{t("settings.requestStructure")}</summary>
                    <pre className="mt-2 p-3 rounded text-xs overflow-x-auto" style={{ background: "var(--surface)", color: "var(--text-secondary)" }}>
{`POST ${inboundWebhookUrl}
Authorization: Bearer <INBOUND_WEBHOOK_SECRET>

{
  "lead": {
    "name": "{lead_name}",
    "email": "{lead_email}",
    "phone": "{phone_number}",
    "company": "{company_name}"
  },
  "message": {
    "content": "Hi, I'm interested",
    "channel": "sms"
  },
  "workspace_id": "${workspaceId}"
}`}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.howWeSound")}</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.toneForFollowThrough")}</p>
            <select
              value={communicationStyle}
              onChange={(e) => setCommunicationStyle(e.target.value as typeof communicationStyle)}
              className="w-full px-3 py-2 rounded text-sm"
              style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
            >
              <option value="direct">{t("settings.directOption")}</option>
              <option value="consultative">{t("settings.consultativeOption")}</option>
            </select>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.coverageScope")}</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{t("settings.coverageSelectDesc")}</p>
            <div className="space-y-3 mb-4">
              {[
                { key: "continuity_messaging" as const, labelKey: "settings.continuityMessaging", descKey: "settings.continuityMessagingDesc" },
                { key: "booking_protection" as const, labelKey: "settings.bookingProtection", descKey: "settings.bookingProtectionDesc" },
                { key: "attendance_protection" as const, labelKey: "settings.attendanceProtection", descKey: "settings.attendanceProtectionDesc" },
                { key: "post_call_continuity" as const, labelKey: "settings.postCallContinuity", descKey: "settings.postCallContinuityDesc" },
                { key: "notifications" as const, labelKey: "settings.notificationsLabel", descKey: "settings.notificationsDesc" },
              ].map(({ key, labelKey, descKey }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--surface)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t(labelKey)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t(descKey)}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={coverageFlags[key]}
                    onClick={() => setCoverageFlags((f) => ({ ...f, [key]: !f[key] }))}
                    className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                    style={{ background: coverageFlags[key] ? "var(--meaning-green)" : "var(--border)" }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-[var(--bg-surface)] transition-[left]"
                      style={{ left: coverageFlags[key] ? "22px" : "2px" }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.handlingCoverage")}</h2>
            {billingStatus?.billing_status === "active" ? (
              <p className="text-sm mb-2" style={{ color: "var(--meaning-green)" }}>{t("settings.inPlaceShort")}</p>
            ) : billingStatus?.renewal_at ? (
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("settings.coverageEndsOn", { date: new Date(billingStatus.renewal_at).toLocaleDateString(undefined, { dateStyle: "long" }) })}
              </p>
            ) : (
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("settings.coverageContinues")}
              </p>
            )}
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{t("settings.responsibilityRemains")}</p>
            {absenceStatements && (
              <div className="mb-4 p-4 rounded-lg text-sm space-y-2" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
                {(() => {
                  const seen = new Set<string>();
                  const lines = [...(absenceStatements.what_would_fail || []), ...(absenceStatements.recent_operation || []), ...(absenceStatements.current_dependency || []), ...(absenceStatements.if_disabled || [])]
                    .filter((line): line is string => Boolean(line) && !seen.has(line) && (seen.add(line), true));
                  return lines.map((line, i) => (
                    <p key={i} style={{ color: "var(--text-secondary)" }}>{line}</p>
                  ));
                })()}
                <button
                  type="button"
                  onClick={() => { setAbsenceStatements(null); window.location.reload(); }}
                  className="text-xs mt-2"
                  style={{ color: "var(--meaning-blue)" }}
                >
                  {t("settings.done")}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Link
                href="/dashboard/continue-protection"
                className="inline-block px-4 py-2 rounded-lg font-medium text-sm"
                style={{ background: "var(--meaning-green)", color: "#0E1116" }}
              >
                {t("settings.continueCoverage")}
              </Link>
              <button
                type="button"
                onClick={() => workspaceId && setPauseConfirmOpen(true)}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{ borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-secondary)" }}
              >
                {t("settings.pauseCoverage")}
              </button>
            </div>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.connectCalendar")}</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              {t("settings.connectCalendarIntro")}
            </p>
            {zoomHealth?.connected && (
              <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
                <p className="font-medium" style={{ color: "var(--meaning-green)" }}>{t("settings.inPlace")}</p>
                {disconnectStatements === null ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!workspaceId) return;
                      const r = await fetch(`/api/system/absence-statements?workspace_id=${encodeURIComponent(workspaceId)}`);
                      const d = (await (r.ok ? r.json() : Promise.resolve(null))) as {
                        what_would_fail?: string[];
                        recent_operation?: string[];
                        current_dependency?: string[];
                        if_disabled?: string[];
                      } | null;
                      const lines = [
                        ...(d?.what_would_fail || []),
                        ...(d?.recent_operation || []),
                        ...(d?.current_dependency || []),
                        ...(d?.if_disabled || []),
                      ].filter(Boolean);
                      if (lines.length) {
                        setDisconnectStatements(lines);
                      } else {
                        setZoomDisconnecting(true);
                        await fetch(`/api/workspaces/${workspaceId}/zoom/disconnect`, { method: "POST" });
                        setZoomHealth({ connected: false });
                        setZoomDisconnecting(false);
                      }
                    }}
                    disabled={zoomDisconnecting}
                    className="mt-2 text-xs hover:underline disabled:opacity-50"
                    style={{ color: "var(--meaning-red)" }}
                  >
                    {t("settings.disconnectZoom")}
                  </button>
                ) : (
                  <div className="mt-2 space-y-1">
                    {disconnectStatements.map((line, i) => (
                      <p key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>{line}</p>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setDisconnectStatements(null)}
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t("settings.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!workspaceId) return;
                          setZoomDisconnecting(true);
                          await fetch(`/api/workspaces/${workspaceId}/zoom/disconnect`, { method: "POST" });
                          setZoomHealth({ connected: false });
                          setZoomDisconnecting(false);
                          setDisconnectStatements(null);
                        }}
                        disabled={zoomDisconnecting}
                        className="text-xs"
                        style={{ color: "var(--meaning-red)" }}
                      >
                        {t("settings.disconnectAnyway")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <Link
              href="/dashboard/activation"
              className="inline-block px-4 py-2 rounded-lg font-medium text-sm"
              style={{ background: "var(--meaning-green)", color: "#0E1116" }}
            >
              {t("settings.connect")}
            </Link>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>{t("settings.whenWeAskBeforeActing")}</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="preview"
                  checked={previewMode}
                  onChange={(e) => setPreviewMode(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "var(--meaning-blue)" }}
                />
                <label htmlFor="preview" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("settings.draftOnlyLabel")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="escalation"
                  checked={escalationEnabled}
                  onChange={(e) => setEscalationEnabled(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "var(--meaning-blue)" }}
                />
                <label htmlFor="escalation" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("settings.handOffLabel")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="callAware"
                  checked={callAwareEnabled}
                  onChange={(e) => setCallAwareEnabled(e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "var(--meaning-blue)" }}
                />
                <label htmlFor="callAware" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("settings.maintainContinuityLabel")}
                </label>
              </div>
            </div>
          </section>

          <button
            onClick={save}
            className="px-4 py-2 rounded-lg font-medium"
            style={{ background: "var(--meaning-green)", color: "#0E1116" }}
          >
            {t("settings.save")}
          </button>

          <div className="pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {showAdvanced ? "−" : "+"} {t("settings.externalSources")}
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.eventNotificationUrl")}</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder={t("settings.eventNotificationUrlPlaceholder")}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{t("settings.teamAwarenessLabel")}</label>
                  <input
                    type="text"
                    value={teamHandoffEmails}
                    onChange={(e) => setTeamHandoffEmails(e.target.value)}
                    placeholder={t("settings.teamAwarenessPlaceholder")}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {t("settings.teamAwarenessHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {pauseConfirmOpen && (
        <ConfirmDialog
          open
          title={t("settings.pauseProtectionTitle")}
          message={t("settings.pauseProtectionMessage")}
          confirmLabel={t("settings.pauseCoverage")}
          variant="default"
          onConfirm={async () => {
            if (!workspaceId) return;
            const res = await fetch("/api/billing/pause-coverage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspace_id: workspaceId }),
            });
            const data = await res.json().catch(() => ({}));
            if (data?.absence_statements && (data.absence_statements.what_would_fail?.length || data.absence_statements.recent_operation?.length || data.absence_statements.current_dependency?.length || data.absence_statements.if_disabled?.length)) {
              setAbsenceStatements(data.absence_statements);
            } else {
              window.location.reload();
            }
          }}
          onClose={() => setPauseConfirmOpen(false)}
        />
      )}
    </div>
  );
}
