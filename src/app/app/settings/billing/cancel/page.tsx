"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { track } from "@/lib/analytics/posthog";

type CancelReasonId = "expensive" | "unused" | "features" | "competitor" | "other";
type CancelStep = 1 | 2 | 3 | 4;

export default function BillingCancelPage() {
  const t = useTranslations("billing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId } = useWorkspace();

  const cancelledFromQuery = searchParams.get("cancelled") === "1";

  const [step, setStep] = useState<CancelStep>(cancelledFromQuery ? 4 : 1);
  const [selectedReason, setSelectedReason] = useState<CancelReasonId | null>(null);
  const [renewalAt, setRenewalAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didTrackCancelled, setDidTrackCancelled] = useState(false);

  const reasonOptions = useMemo(
    () =>
      [
        { id: "expensive", label: t("cancelReasonTooExpensive") },
        { id: "unused", label: t("cancelReasonUnused") },
        { id: "features", label: t("cancelReasonMissingFeatures") },
        { id: "competitor", label: t("cancelReasonCompetitor") },
        { id: "other", label: t("cancelReasonOther") },
      ] as const,
    [t]
  );

  const selectedReasonLabel = useMemo(() => {
    if (!selectedReason) return null;
    return reasonOptions.find((r) => r.id === selectedReason)?.label ?? null;
  }, [reasonOptions, selectedReason]);

  useEffect(() => {
    if (cancelledFromQuery) {
      setStep(4);
      // Restore the selected cancellation reason so we can attribute PostHog events.
      try {
        const raw = localStorage.getItem("rt_cancel_survey");
        if (raw) {
          const parsed = JSON.parse(raw) as { reasonId?: CancelReasonId };
          if (parsed?.reasonId) setSelectedReason(parsed.reasonId);
        }
      } catch {
        // ignore
      }
    }
  }, [cancelledFromQuery]);

  useEffect(() => {
    if (!workspaceId) return;
    const controller = new AbortController();
    setError(null);
    fetch(`/api/billing/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setRenewalAt(typeof data.renewal_at === "string" ? data.renewal_at : null);
      })
      .catch((_err) => { /* silenced */ });

    return () => controller.abort();
  }, [workspaceId]);

  useEffect(() => {
    if (!cancelledFromQuery) return;
    if (step !== 4) return;
    if (didTrackCancelled) return;
    if (!selectedReasonLabel) return;
    track("subscription_cancelled", {
      reason: selectedReasonLabel ?? undefined,
    });
    setDidTrackCancelled(true);
  }, [cancelledFromQuery, didTrackCancelled, renewalAt, selectedReasonLabel, step]);

  const openBillingPortalForCancellation = async () => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const returnUrl = typeof window !== "undefined"
        ? `${window.location.origin}/app/settings/billing/cancel?cancelled=1`
        : undefined;

      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          return_url: returnUrl,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; url?: string; reason?: string } | null;
      if (!res.ok || !data?.ok || !data.url) {
        setError(data?.reason ?? "Failed to open billing portal.");
        return;
      }

      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open billing portal.");
    } finally {
      setBusy(false);
    }
  };

  const formatEndDate = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });
    } catch {
      return null;
    }
  };

  const endDateFormatted = formatEndDate(renewalAt);

  if (!workspaceId) {
    return (
      <div className="p-6 max-w-2xl mx-auto" style={{ color: "var(--text-primary)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/app/settings/billing" className="underline text-sm" style={{ color: "var(--text-secondary)" }}>
          ← Back to billing
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--accent-danger)", color: "var(--text-primary)" }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <h1 className="text-[21px] font-normal" style={{ color: "var(--text-primary)" }}>
            {t("cancelReasonTitle")}
          </h1>

          <fieldset className="space-y-3">
            {reasonOptions.map((opt) => (
              <label
                key={opt.id}
                className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer"
                style={{ borderColor: selectedReason === opt.id ? "var(--accent-primary)" : "var(--border)", background: "var(--bg-inset)" }}
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  value={opt.id}
                  checked={selectedReason === opt.id}
                  onChange={() => {
                    setSelectedReason(opt.id);
                    setStep(2);
                  }}
                />
                <span className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {opt.label}
                </span>
              </label>
            ))}
          </fieldset>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("cancelOfferText")}
          </h2>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium disabled:opacity-60"
              disabled={!selectedReasonLabel || busy}
              onClick={() => {
                track("subscription_cancel_offer_accepted", { reason: selectedReasonLabel ?? undefined });
                router.push("/app/settings/billing");
              }}
            >
              {t("cancelAcceptOffer")}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-inset)]"
              disabled={!selectedReasonLabel || busy}
              onClick={() => {
                if (!selectedReasonLabel || !selectedReason) return;
                if (typeof window !== "undefined") {
                  localStorage.setItem(
                    "rt_cancel_survey",
                    JSON.stringify({
                      reason: selectedReasonLabel,
                      reasonId: selectedReason,
                      action: "continue_cancellation",
                      at: Date.now(),
                    }),
                  );
                }
                track("subscription_cancel_intent", { reason: selectedReasonLabel, action: "continue_cancellation" });
                setStep(3);
              }}
            >
              {t("cancelContinueCancellation")}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("confirmCancel")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {t("cancelSuccessBody", { endDate: endDateFormatted ?? "your renewal date" })}
          </p>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-inset)]"
              disabled={busy}
              onClick={() => setStep(2)}
            >
              {t("back")}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium disabled:opacity-60"
              disabled={busy}
              onClick={() => void openBillingPortalForCancellation()}
            >
              {t("cancelCancelSubscription")}
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border p-6 space-y-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <h1 className="text-[21px] font-normal" style={{ color: "var(--text-primary)" }}>
            {t("cancelSuccessTitle")}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {t("cancelSuccessBody", { endDate: endDateFormatted ?? "your renewal date" })}
          </p>

          <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {t("cancelDataRetainedText")}
          </p>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-inset)]"
              onClick={() => router.push("/app/settings/billing")}
            >
              {t("back")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

