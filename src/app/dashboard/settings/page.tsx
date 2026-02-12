"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, Card, CardHeader, CardBody, EmptyState } from "@/components/ui";

export default function SettingsPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [callAwareEnabled, setCallAwareEnabled] = useState(true);
  const [communicationStyle, setCommunicationStyle] = useState<"direct" | "consultative">("consultative");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);
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
      })
      .catch(() => {});
    fetch(`/api/workspaces/${workspaceId}/webhook-config`)
      .then((r) => r.ok ? r.json() : Promise.resolve({ endpoint_url: "" }))
      .then((d: { endpoint_url?: string }) => setWebhookUrl(d?.endpoint_url ?? ""))
      .catch(() => {});
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
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { session?: { email?: string } | null }) => setSessionEmail(d?.session?.email ?? null))
      .catch(() => setSessionEmail(null));
  }, []);

  const save = async () => {
    if (!workspaceId) return;
    const res = await fetch(`/api/workspaces/${workspaceId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preview_mode: previewMode,
        escalation_rules: { enabled: escalationEnabled },
        call_aware_enabled: callAwareEnabled,
        communication_style: communicationStyle,
        coverage_flags: coverageFlags,
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
    }).catch(() => {});
    setSaved(res.ok);
  };

  return (
    <div className="p-8 max-w-xl mx-auto" style={{ color: "var(--text-primary)" }}>
      <PageHeader title="Preferences" subtitle="How we work for you" />
      {!workspaceId ? (
        <EmptyState title="Watching for new conversations" subtitle="Maintaining continuity" icon="watch" />
      ) : (
        <div className="space-y-6">
          {sessionEmail && (
            <Card>
              <CardHeader>Account</CardHeader>
              <CardBody>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Signed in as <span style={{ color: "var(--text-primary)" }}>{sessionEmail}</span>
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
                  Log out
                </button>
              </CardBody>
            </Card>
          )}
          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Business context</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              Help us match your tone and offer. This makes replies more accurate.
            </p>
            <button
              type="button"
              onClick={() => setShowBusinessContext(!showBusinessContext)}
              className="text-sm mb-3"
              style={{ color: "var(--meaning-blue)" }}
            >
              {showBusinessContext ? "−" : "+"} {showBusinessContext ? "Hide" : "Show"} business context
            </button>
            {showBusinessContext && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Business name</label>
                  <input
                    type="text"
                    value={businessContext.business_name}
                    onChange={(e) => setBusinessContext({ ...businessContext, business_name: e.target.value })}
                    placeholder="Your business name"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>What you offer (1-2 lines)</label>
                  <textarea
                    value={businessContext.offer_summary}
                    onChange={(e) => setBusinessContext({ ...businessContext, offer_summary: e.target.value })}
                    placeholder="Brief description of your service or product"
                    rows={2}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ideal customer</label>
                  <input
                    type="text"
                    value={businessContext.ideal_customer}
                    onChange={(e) => setBusinessContext({ ...businessContext, ideal_customer: e.target.value })}
                    placeholder="Who this is for"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Pricing (optional)</label>
                  <input
                    type="text"
                    value={businessContext.pricing_range}
                    onChange={(e) => setBusinessContext({ ...businessContext, pricing_range: e.target.value })}
                    placeholder="e.g., Starts at £500"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Booking link <span style={{ color: "var(--text-muted)" }}>(recommended)</span>
                  </label>
                  <input
                    type="url"
                    value={businessContext.booking_link}
                    onChange={(e) => setBusinessContext({ ...businessContext, booking_link: e.target.value })}
                    placeholder="https://calendly.com/..."
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
                    Allow discounts in negotiations
                  </label>
                </div>
              </div>
            )}
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>How we sound</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Tone when we maintain continuity</p>
            <select
              value={communicationStyle}
              onChange={(e) => setCommunicationStyle(e.target.value as typeof communicationStyle)}
              className="w-full px-3 py-2 rounded text-sm"
              style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
            >
              <option value="direct">Direct — short and clear</option>
              <option value="consultative">Consultative — warm, asks questions</option>
            </select>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Coverage scope</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Select what we&apos;re responsible for</p>
            <div className="space-y-3 mb-4">
              {[
                { key: "continuity_messaging" as const, label: "Continuity messaging", desc: "Replies, follow-ups, recoveries" },
                { key: "booking_protection" as const, label: "Booking protection", desc: "Qualification to booking routing" },
                { key: "attendance_protection" as const, label: "Attendance protection", desc: "Confirmations, reminders, rescue" },
                { key: "post_call_continuity" as const, label: "Post-call continuity", desc: "Call-aware follow-ups, hesitation monitor" },
                { key: "notifications" as const, label: "Notifications", desc: "Outbound webhooks" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--surface)" }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>
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
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: coverageFlags[key] ? "22px" : "2px" }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Coverage</h2>
            {billingStatus?.billing_status === "active" ? (
              <p className="text-sm mb-2" style={{ color: "var(--meaning-green)" }}>Billing active</p>
            ) : billingStatus?.renewal_at ? (
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                Trial ends on {new Date(billingStatus.renewal_at).toLocaleDateString()}. Cancel before renewal.
              </p>
            ) : (
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                Coverage continues automatically. Pause protection anytime. Resume when ready.
              </p>
            )}
            <div className="flex gap-2">
              <Link
                href="/dashboard/continue-protection"
                className="inline-block px-4 py-2 rounded-lg font-medium text-sm"
                style={{ background: "var(--meaning-green)", color: "#0E1116" }}
              >
                Continue coverage
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (!workspaceId || !confirm("Pause protection? Coverage runs until period end. Resume anytime.")) return;
                  await fetch("/api/billing/pause-coverage", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ workspace_id: workspaceId }),
                  });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{ borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-secondary)" }}
              >
                Pause coverage
              </button>
            </div>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>Connect your calendar</h2>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              We handle conversations once connected.
            </p>
            {zoomHealth?.connected && (
              <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
                <p className="font-medium" style={{ color: "var(--meaning-green)" }}>Connected</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!workspaceId) return;
                    setZoomDisconnecting(true);
                    await fetch(`/api/workspaces/${workspaceId}/zoom/disconnect`, { method: "POST" });
                    setZoomHealth({ connected: false });
                    setZoomDisconnecting(false);
                  }}
                  disabled={zoomDisconnecting}
                  className="mt-2 text-xs hover:underline disabled:opacity-50"
                  style={{ color: "var(--meaning-red)" }}
                >
                  Disconnect Zoom
                </button>
              </div>
            )}
            <Link
              href="/dashboard/activation"
              className="inline-block px-4 py-2 rounded-lg font-medium text-sm"
              style={{ background: "var(--meaning-green)", color: "#0E1116" }}
            >
              Connect
            </Link>
          </section>

          <section className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>When we ask before acting</h2>
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
                  Draft only — we prepare but do not send
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
                  Ask before we act on high-value conversations
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
                  Maintain continuity after calls
                </label>
              </div>
            </div>
          </section>

          <button
            onClick={save}
            className="px-4 py-2 rounded-lg font-medium"
            style={{ background: "var(--meaning-green)", color: "#0E1116" }}
          >
            Save
          </button>
          {saved && <p className="text-sm" style={{ color: "var(--meaning-green)" }}>Saved</p>}

          <div className="pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {showAdvanced ? "−" : "+"} Webhooks
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Event notification URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
