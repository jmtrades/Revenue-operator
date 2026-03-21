"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

type ValidateState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "valid"; workspaceName: string; inviterName: string; email?: string }
  | { status: "accepted"; redirectUrl: string };

export default function AcceptInvitePage() {
  const t = useTranslations("team");
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<ValidateState>(token ? { status: "loading" } : { status: "invalid" });
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => setState({ status: "invalid" }));
      return;
    }
    let cancelled = false;
    fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; error?: string; workspaceName?: string; inviterName?: string; email?: string }) => {
        if (cancelled) return;
        if (data.ok && data.workspaceName) {
          setState({
            status: "valid",
            workspaceName: data.workspaceName,
            inviterName: data.inviterName ?? t("acceptInvite.defaultInviter"),
            email: data.email,
          });
        } else if (data.error === "expired") {
          setState({ status: "expired" });
        } else {
          setState({ status: "invalid" });
        }
      })
      .catch(() => { if (!cancelled) setState({ status: "invalid" }); });
    return () => { cancelled = true; };
  }, [token, t]);

  const handleAccept = () => {
    if (!token || state.status !== "valid" || accepting) return;
    setAcceptError(null);
    setAccepting(true);
    fetch("/api/invite/accept", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const data = await r.json() as { ok?: boolean; redirectUrl?: string; error?: string };
        return { ok: r.ok, status: r.status, data };
      })
      .then(({ status, data }) => {
        if (data.ok && data.redirectUrl) {
          setState({ status: "accepted", redirectUrl: data.redirectUrl });
          window.location.href = data.redirectUrl;
        } else if (data.error === "Unauthorized" || status === 401) {
          setAcceptError(t("signInFirstToAccept"));
        } else if (data.error === "expired") {
          setState({ status: "expired" });
        } else {
          setAcceptError(data.error ?? t("acceptInviteError"));
        }
      })
      .catch(() => setAcceptError(t("acceptInviteError")))
      .finally(() => setAccepting(false));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8">
        {state.status === "loading" && (
          <p className="text-[var(--text-secondary)] text-center">{t("acceptInvite.checkingInvite")}</p>
        )}
        {state.status === "invalid" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{t("acceptInvite.invalidLink")}</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">{t("acceptInvite.invalidLinkDesc")}</p>
            <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none">
              {t("acceptInvite.goHome")}
            </Link>
          </>
        )}
        {state.status === "expired" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{t("acceptInvite.expiredTitle")}</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">{t("acceptInvite.expiredDesc")}</p>
            <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none">
              {t("acceptInvite.goHome")}
            </Link>
          </>
        )}
        {state.status === "valid" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{t("acceptInvite.joinTitle", { workspaceName: state.workspaceName })}</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              {t("acceptInvite.invitedYou", { inviterName: state.inviterName })}
            </p>
            {acceptError && <p className="text-[var(--accent-red)] text-sm mb-4" role="alert">{acceptError}</p>}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
              >
                {accepting ? t("acceptInvite.accepting") : t("acceptInvite.acceptButton")}
              </button>
              <p className="text-xs text-[var(--text-tertiary)] text-center">{t("acceptInvite.noAccount")}</p>
              <div className="flex gap-3 justify-center">
                <Link
                  href={`/sign-in?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {t("acceptInvite.signIn")}
                </Link>
                <span className="text-[var(--text-tertiary)]">·</span>
                <Link
                  href={`/sign-in?create=1&next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {t("acceptInvite.createAccount")}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
