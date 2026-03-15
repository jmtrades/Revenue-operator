"use client";

import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";

type WorkspaceVoiceButtonProps = {
  title?: string;
  description?: string;
  startLabel?: string;
  endLabel?: string;
  showUnavailable?: boolean;
};

export function WorkspaceVoiceButton({
  title = "Test your phone line",
  description = "Trigger a real test call to your verified phone number and hear your AI agent live.",
  startLabel = "Call my phone",
  endLabel: _endLabel = "End voice test",
  showUnavailable: _showUnavailable = false,
}: WorkspaceVoiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tAgents = useTranslations("agents");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!status && !error) return;
    const id = window.setTimeout(() => {
      setStatus(null);
      setError(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [status, error]);

  const startCall = async () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/agents/test-call/me", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data.ok) {
        setStatus(data.message ?? tAgents("toast.agentLive"));
      } else {
        setError(data.error ?? tCommon("error.generic"));
      }
    } catch {
      setError(tCommon("error.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/10 text-emerald-300"
          aria-hidden
        >
          <Phone className="h-5 w-5" />
        </div>
        <button
          type="button"
          onClick={startCall}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 disabled:opacity-60"
        >
          <Phone className="h-4 w-4" />
          {loading ? "Calling your phone…" : startLabel}
        </button>
      </div>
      {status && (
        <p className="mt-3 text-xs text-emerald-400" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
