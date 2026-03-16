"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function SignInForm() {
  const t = useTranslations("auth");
  const sp = useSearchParams();
  const oauthError = sp?.get("error") ?? "";
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [noAccount, setNoAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const tToast = useTranslations("toast");

  const oauthErrorMessage =
    oauthError === "google_config"
      ? "Google sign-in is not configured yet."
      : oauthError === "google_state"
        ? "Google sign-in expired. Please try again."
        : oauthError === "google_exchange" || oauthError === "google_profile"
          ? "Google sign-in could not be completed. Please try again."
          : oauthError === "google_account" || oauthError === "google_workspace" || oauthError === "google_session"
            ? "Account setup could not be completed after Google sign-in."
            : oauthError === "auth"
              ? t("toasts.signInFailed")
              : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setNoAccount(false);
    setBusy(true);
    try {
      const url = "/api/auth/signin";
      const body: Record<string, string> = {
        email: email.trim().toLowerCase(),
        password: pw,
      };
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        // If we don't have a matching local signup snapshot, show the guided CTA
        let shouldShowNoAccount = false;
        try {
          const raw = window.localStorage.getItem("rt_signup");
          const parsed = raw ? (JSON.parse(raw) as { email?: string | null }) : null;
          const storedEmail = parsed?.email?.toLowerCase() ?? "";
          const currentEmail = email.trim().toLowerCase();
          if (!storedEmail || storedEmail !== currentEmail) {
            shouldShowNoAccount = true;
          }
        } catch {
          shouldShowNoAccount = true;
        }

        if (shouldShowNoAccount) {
          setNoAccount(true);
        } else {
          setErr((d as { error?: string }).error || t("genericError"));
        }
        setBusy(false);
        return;
      }
      const nextUrl = sp?.get("next")?.trim();
      const safeNext =
        nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : null;
      const redirect =
        safeNext || (d as { redirectTo?: string }).redirectTo || "/app/activity";
      try {
        const payload = {
          email: email.trim().toLowerCase(),
          at: Date.now(),
        };
        window.localStorage.setItem("rt_signup", JSON.stringify(payload));
        window.localStorage.setItem("rt_authenticated", JSON.stringify(payload));
      } catch {
        // ignore localStorage failures
      }
      window.location.href = redirect;
    } catch {
      setErr("Network error — please try again");
      setBusy(false);
    }
  }

  async function google() {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/auth/google", { method: "GET", redirect: "follow" });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      const data = await res.json().catch(() => ({}));
      const url = (data as { url?: string }).url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Google sign-in is not configured yet.");
        setGoogleBusy(false);
      }
    } catch {
      toast.error("Could not connect to Google. Please try again.");
      setGoogleBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] space-y-5">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="flex justify-center mb-5">
            <div className="w-11 h-11 rounded-full bg-white text-gray-900 flex items-center justify-center font-bold text-sm tracking-tight">
              RT
            </div>
          </div>
          <h1 className="text-[22px] font-semibold text-[var(--text-primary)] text-center tracking-tight">
            {t("signIn.title")}
          </h1>
          <p className="text-[var(--text-secondary)] text-[13px] text-center mt-1 mb-7">
            {t("signIn.subtitle")}
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
                {t("email.label")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setNoAccount(false);
                  setErr("");
                }}
                placeholder={t("signIn.emailPlaceholder")}
                autoComplete="email"
                aria-label="Email address"
                className="w-full px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-zinc-500/40 focus:border-[var(--border-focus)] transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder={t("signIn.passwordPlaceholder")}
                  autoComplete="current-password"
                  aria-label={t("password.label")}
                  className="w-full px-3.5 py-2.5 pr-16 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-zinc-500/40 focus:border-[var(--border-focus)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? t("signIn.hidePasswordAria") : t("signIn.showPasswordAria")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-[13px] font-medium transition"
                >
                  {showPw ? t("signIn.hidePassword") : t("signIn.showPassword")}
                </button>
              </div>
            </div>
            {(noAccount || err || oauthErrorMessage) && (
              <div className="space-y-2">
                {noAccount ? (
                  <div className="px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-[13px] text-[var(--text-secondary)]">
                    {t("signIn.noAccountPrefix")}
                    <Link
                      href="/activate"
                      className="text-[var(--text-primary)] font-medium hover:underline"
                    >
                      {t("signIn.startFreeCta")}
                    </Link>
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-xl text-[var(--accent-red)] text-[13px]">
                    {err || oauthErrorMessage}
                  </div>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              aria-label={t("signIn.button")}
              className="w-full py-2.5 bg-white text-gray-900 font-semibold text-[15px] rounded-xl hover:bg-white/90 active:opacity-90 disabled:opacity-50 transition-all duration-150 shadow-lg shadow-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
            >
              {busy ? t("signingIn") : `${t("signIn.button")} →`}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--border-default)]" />
            <span className="text-[var(--text-tertiary)] text-[11px] font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[var(--border-default)]" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={googleBusy}
            className="w-full py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium text-[14px] rounded-xl flex items-center justify-center gap-2.5 hover:bg-[var(--bg-input-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleBusy ? t("signIn.googleComingSoon") : "Continue with Google"}
          </button>

          <p className="text-center text-[var(--text-tertiary)] text-[13px] mt-4">
            <Link
              href="/forgot-password"
              className="hover:text-[var(--text-secondary)] transition underline-offset-2 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </p>
        </div>

        <p className="text-center text-[var(--text-secondary)] text-[13px]">
          {t("noAccount")}{" "}
          <Link
            href="/activate"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            {t("signIn.startFreeCta")}
          </Link>
        </p>
      </div>
    </div>
  );
}
