"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
    };

    void checkSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(Boolean(session));
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Could not update password.");
        return;
      }
      setMessage("Password saved. You can sign in now.");
      setReady(false);
    } catch {
      setError("Something went wrong. Try the reset link again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] px-4 py-12 text-[var(--text-primary)]">
      <div className="mx-auto mt-16 max-w-[420px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Open the reset link from your email, then set a new password here.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-[var(--text-secondary)]">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/30"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm text-[var(--text-secondary)]">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/30"
            />
          </div>

          {!ready && !message ? (
            <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-[var(--text-secondary)]">
              Open the email reset link first, then return to this page if needed.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]/50 focus-visible:outline-none disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          <Link href="/sign-in" className="text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
