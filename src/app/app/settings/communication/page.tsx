"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync, invalidateWorkspaceMeCache } from "@/lib/client/workspace-me";
import { cn } from "@/lib/cn";
import { ArrowLeft, MessageCircle, Phone, Mail, Radio } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type CommunicationConfig = {
  communication_mode: "all_channels" | "calls_texts" | "calls_only" | "texts_only";
  agent_mode: "inbound_outbound" | "inbound_only" | "outbound_only" | "passive";
  default_preferences: {
    phone_calls: boolean;
    sms_messages: boolean;
    email: boolean;
  };
};

const DEFAULT_CONFIG: CommunicationConfig = {
  communication_mode: "all_channels",
  agent_mode: "inbound_outbound",
  default_preferences: {
    phone_calls: true,
    sms_messages: true,
    email: true,
  },
};

export default function CommunicationSettingsPage() {
  const t = useTranslations("communication");
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const effectiveWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || null;

  const [config, setConfig] = useState<CommunicationConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/workspace/communication-mode", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Partial<CommunicationConfig> | null) => {
        if (cancelled) return;
        if (data && typeof data === "object") {
          setConfig({ ...DEFAULT_CONFIG, ...data });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoading(false);
          toast.error(t("toast.error"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = useMemo(() => {
    return Boolean(effectiveWorkspaceId);
  }, [effectiveWorkspaceId]);

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/communication-mode", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(t("toast.error"));
        return;
      }
      toast.success(t("toast.saved"));
      invalidateWorkspaceMeCache();
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/app" },
        { label: "Settings", href: "/app/settings" },
        { label: "Communication" }
      ]} />

      <div className="mt-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            Communication & Agent Mode
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Configure how your AI operator communicates with contacts
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave || saving}
          className={cn(
            "px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap",
            canSave ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90" : "bg-[var(--bg-input)] text-[var(--text-tertiary)]",
            saving ? "opacity-60 cursor-not-allowed" : "",
          )}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {/* Section 1: Communication Channels */}
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Communication Channels</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Choose which channels your AI operator can use to reach contacts.
          </p>
          <div className="grid gap-3">
            {(
              [
                {
                  value: "all_channels",
                  label: "All Channels",
                  desc: "Agent can make calls, send texts, and emails",
                },
                {
                  value: "calls_texts",
                  label: "Calls & Texts",
                  desc: "Agent can make calls and send SMS, no email",
                },
                {
                  value: "calls_only",
                  label: "Calls Only",
                  desc: "Agent will only make phone calls, no texts or emails",
                },
                {
                  value: "texts_only",
                  label: "Texts Only",
                  desc: "Agent will only send SMS and emails, no phone calls",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors border-[var(--border-default)] hover:border-[var(--border-medium)]"
              >
                <input
                  type="radio"
                  name="communication_mode"
                  checked={config.communication_mode === opt.value}
                  onChange={() =>
                    setConfig((c) => ({
                      ...c,
                      communication_mode: opt.value,
                    }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Section 2: Agent Mode */}
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Agent Operating Mode</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Control how your AI operator initiates and receives interactions.
          </p>
          <div className="grid gap-3">
            {(
              [
                {
                  value: "inbound_outbound",
                  label: "Inbound & Outbound",
                  desc: "Agent answers incoming calls AND proactively reaches out to leads",
                },
                {
                  value: "inbound_only",
                  label: "Inbound Only",
                  desc: "Agent only answers incoming calls. Won't initiate outbound calls or messages",
                },
                {
                  value: "outbound_only",
                  label: "Outbound Only",
                  desc: "Agent only makes outbound calls and sends messages. Inbound calls go to voicemail",
                },
                {
                  value: "passive",
                  label: "Passive Mode",
                  desc: "Agent doesn't make or take calls. Only syncs CRM data, tracks leads, and manages follow-ups via text/email",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors border-[var(--border-default)] hover:border-[var(--border-medium)]"
              >
                <input
                  type="radio"
                  name="agent_mode"
                  checked={config.agent_mode === opt.value}
                  onChange={() =>
                    setConfig((c) => ({
                      ...c,
                      agent_mode: opt.value,
                    }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Section 3: Default Contact Preferences */}
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-4 w-4 text-[var(--text-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Default Contact Preferences</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Default channel preferences for new contacts. Individual contacts can override these.
          </p>
          <div className="grid gap-3">
            {/* Phone Calls Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-medium)] transition-colors">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Phone Calls</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Allow agent to make incoming/outgoing phone calls</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.default_preferences.phone_calls}
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    default_preferences: {
                      ...c.default_preferences,
                      phone_calls: !c.default_preferences.phone_calls,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.default_preferences.phone_calls ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                    config.default_preferences.phone_calls
                      ? "translate-x-6 bg-[var(--text-primary)]"
                      : "translate-x-1 bg-[var(--text-tertiary)]"
                  }`}
                />
              </button>
            </div>

            {/* SMS Messages Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-medium)] transition-colors">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">SMS Messages</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Allow agent to send and receive SMS text messages</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.default_preferences.sms_messages}
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    default_preferences: {
                      ...c.default_preferences,
                      sms_messages: !c.default_preferences.sms_messages,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.default_preferences.sms_messages ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                    config.default_preferences.sms_messages
                      ? "translate-x-6 bg-[var(--text-primary)]"
                      : "translate-x-1 bg-[var(--text-tertiary)]"
                  }`}
                />
              </button>
            </div>

            {/* Email Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-medium)] transition-colors">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Email</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Allow agent to send and receive emails</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.default_preferences.email}
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    default_preferences: {
                      ...c.default_preferences,
                      email: !c.default_preferences.email,
                    },
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.default_preferences.email ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                    config.default_preferences.email
                      ? "translate-x-6 bg-[var(--text-primary)]"
                      : "translate-x-1 bg-[var(--text-tertiary)]"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-[var(--text-tertiary)]">Loading settings...</p>
      ) : null}
    </div>
  );
}
