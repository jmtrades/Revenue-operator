"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ValidateState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "valid"; workspaceName: string; inviterName: string; email?: string }
  | { status: "accepted"; redirectUrl: string };

export default function AcceptInvitePage() {
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
            inviterName: data.inviterName ?? "A team member",
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
  }, [token]);

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
          setAcceptError("Please sign in first to accept this invitation.");
        } else if (data.error === "expired") {
          setState({ status: "expired" });
        } else {
          setAcceptError(data.error ?? "Something went wrong. Try again.");
        }
      })
      .catch(() => setAcceptError("Something went wrong. Try again."))
      .finally(() => setAccepting(false));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8">
        {state.status === "loading" && (
          <p className="text-[var(--text-secondary)] text-center">Checking invite…</p>
        )}
        {state.status === "invalid" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Invalid invite link</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">This link may be broken or already used.</p>
            <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none">
              Go home
            </Link>
          </>
        )}
        {state.status === "expired" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">This invite has expired</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">Ask the person who invited you to send a new one.</p>
            <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none">
              Go home
            </Link>
          </>
        )}
        {state.status === "valid" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Join {state.workspaceName}</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              {state.inviterName} invited you to join this workspace on Recall Touch.
            </p>
            {acceptError && <p className="text-[var(--accent-red)] text-sm mb-4" role="alert">{acceptError}</p>}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none"
              >
                {accepting ? "Accepting…" : "Accept invitation"}
              </button>
              <p className="text-xs text-[var(--text-tertiary)] text-center">Don’t have an account?</p>
              <div className="flex gap-3 justify-center">
                <Link
                  href={`/sign-in?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Sign in
                </Link>
                <span className="text-[var(--text-tertiary)]">·</span>
                <Link
                  href={`/sign-in?create=1&next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Create account
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
