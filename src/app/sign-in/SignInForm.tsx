"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SignInForm() {
  const t = useTranslations("auth");
  const sp = useSearchParams();
  const router = useRouter();
  const oauthError = sp?.get("error") ?? "";
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [checking, setChecking] = useState(true);
  // Check if user already has a valid session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          // User has an active session, redirect to dashboard
          router.push("/app/dashboard");
          return;
        }
      } catch {
        // Continue with sign-in page
      }
      setChecking(false);
    };
    checkSession();
  }, [router]);

  const oauthErrorMessage =
    oauthError === "google_config"
      ? t("oauth.googleNotConfigured")
      : oauthError === "google_state"
        ? t("oauth.googleExpired")
        : oauthError === "google_exchange" || oauthError === "google_profile"
          ? t("oauth.googleFailed")
          : oauthError === "google_account" || oauthError === "google_workspace" || oauthError === "google_session"
            ? t("oauth.googleAccountFailed")
            : oauthError === "auth"
              ? t("toasts.signInFailed")
              : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
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
        // Show API error message or improved generic message
        const apiError = (d as { error?: string }).error;
        if (apiError?.toLowerCase().includes("invalid") || apiError?.toLowerCase().includes("incorrect")) {
          setErr(t("signIn.errorInvalid"));
        } else {
          setErr(apiError || t("signIn.errorInvalid"));
        }
        setBusy(false);
        return;
      }
      const nextUrl = sp?.get("next")?.trim();
      const safeNext =
        nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : null;
      const redirect =
        safeNext || (d as { redirectTo?: string }).redirectTo || "/app/dashboard";
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
      setErr(t("signIn.errorGeneric"));
      setBusy(false);
    }
  }

  function google() {
    if (googleBusy) return;
    setGoogleBusy(true);
    // Use direct navigation instead of fetch() to avoid cross-origin redirect issues.
    // The /api/auth/google route returns a 307 to accounts.google.com, which fetch()
    // cannot follow cross-origin, but full-page navigation handles it correctly.
    window.location.href = "/api/auth/google";
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
        <div className="w-full max-w-[420px]">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-8 shadow-[var(--shadow-xl)] flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
              <p className="text-sm text-[var(--text-secondary)]">Checking session...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] space-y-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-8 shadow-[var(--shadow-xl)]">
          <div className="flex justify-center mb-5">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="w-11 h-11 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] flex items-center justify-center font-bold text-sm tracking-tight">
              RT
            </motion.div>
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
                  setErr("");
                }}
                placeholder={t("signIn.emailPlaceholder")}
                autoComplete="email"
                aria-label="Email address"
                className="w-full px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:ring-offset-2 transition-[border-color,box-shadow]"
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
                  minLength={8}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder={t("signIn.passwordPlaceholder")}
                  autoComplete="current-password"
                  aria-label={t("password.label")}
                  className="w-full px-3.5 py-2.5 pr-16 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:ring-offset-2 transition-[border-color,box-shadow]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? t("signIn.hidePasswordAria") : t("signIn.showPasswordAria")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-[13px] font-medium transition-colors duration-200"
                >
                  {showPw ? t("signIn.hidePassword") : t("signIn.showPassword")}
                </button>
              </div>
            </div>
            {(err || oauthErrorMessage) && (
              <div className="space-y-2">
                <div className="px-3.5 py-2.5 bg-[var(--accent-danger-subtle)] border border-[var(--accent-danger-subtle)]/60 rounded-xl text-[var(--accent-danger)] text-[13px]">
                  {err || oauthErrorMessage}
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              aria-label={t("signIn.button")}
              className="w-full py-2.5 bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold text-[15px] rounded-xl hover:bg-[var(--bg-hover)] active:scale-[0.97] disabled:opacity-50 transition-[background-color,border-color,color,transform] duration-150 shadow-lg shadow-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
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
            className="w-full py-2.5 bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium text-[14px] rounded-xl flex items-center justify-center gap-2.5 hover:bg-[var(--bg-input-hover)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-[background-color,border-color,color,transform]"
          >
            {googleBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
                <span>Redirecting…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
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
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <p className="text-center text-[var(--text-tertiary)] text-[13px] mt-4">
            <Link
              href="/forgot-password"
              className="hover:text-[var(--text-secondary)] transition underline-offset-2 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </p>
        </motion.div>

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
