"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("resetPassword.errorSendFailed"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("resetPassword.errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] px-4 py-12 text-[var(--text-primary)]">
      <div className="mx-auto mt-16 max-w-[420px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{t("resetPassword.title")}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("resetPassword.subtitle")}
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-[var(--text-secondary)]">
              {t("resetPassword.emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("resetPassword.emailPlaceholder")}
              autoComplete="email"
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-zinc-500/40"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {sent ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {t("resetPassword.successMessage")}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
          >
            {busy ? t("resetPassword.sending") : t("resetPassword.submitLabel")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          <Link href="/sign-in" className="text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded">
            {t("resetPassword.backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
