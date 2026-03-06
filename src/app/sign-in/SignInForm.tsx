"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignInForm() {
  const sp = useSearchParams();
  const isCreate = sp?.get("create") === "1";
  const oauthError = sp?.get("error") ?? "";
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [biz, setBiz] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
              ? "Sign-in could not be completed. Please try again."
              : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const url = isCreate ? "/api/auth/signup" : "/api/auth/signin";
      const body: Record<string, string> = { email: email.trim().toLowerCase(), password: pw };
      if (isCreate && biz.trim()) body.businessName = biz.trim();
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr((d as { error?: string }).error || "Something went wrong");
        setBusy(false);
        return;
      }
      const redirect = (d as { redirectTo?: string }).redirectTo || "/app/activity";
      window.location.href = redirect;
    } catch {
      setErr("Network error — please try again");
      setBusy(false);
    }
  }

  async function google() {
    setGoogleBusy(true);
    const params = new URLSearchParams();
    params.set("next", isCreate ? "/app/onboarding" : "/app/activity");
    window.location.href = `/api/auth/google?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-[#080d19] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] space-y-5">
        <div className="bg-gradient-to-b from-[#111827] to-[#0f1623] border border-white/[0.08] rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="flex justify-center mb-5">
            <div className="w-11 h-11 rounded-full bg-white text-[#080d19] flex items-center justify-center font-bold text-sm tracking-tight">
              RT
            </div>
          </div>
          <h1 className="text-[22px] font-semibold text-white text-center tracking-tight">
            {isCreate ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-white/40 text-[13px] text-center mt-1 mb-7">
            {isCreate ? "Start your 14-day free trial" : "Sign in to continue"}
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-[13px] font-medium text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-white/50 mb-1.5">
                Password{isCreate ? " (min 6 characters)" : ""}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder={isCreate ? "Create a password" : "Enter password"}
                  autoComplete={isCreate ? "new-password" : "current-password"}
                  className="w-full px-3.5 py-2.5 pr-16 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50 text-[13px] font-medium transition"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {isCreate && (
              <div>
                <label className="block text-[13px] font-medium text-white/50 mb-1.5">
                  Business name <span className="text-white/25">(optional)</span>
                </label>
                <input
                  type="text"
                  value={biz}
                  onChange={(e) => setBiz(e.target.value)}
                  placeholder="Acme Co"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>
            )}
            {(err || oauthErrorMessage) && (
              <div className="px-3.5 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-[13px]">
                {err || oauthErrorMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-white text-[#080d19] font-semibold text-[15px] rounded-xl hover:bg-white/90 active:opacity-90 disabled:opacity-50 transition-all duration-150 shadow-lg shadow-white/[0.08]"
            >
              {busy
                ? isCreate
                  ? "Creating account..."
                  : "Signing in..."
                : isCreate
                  ? "Create account →"
                  : "Sign in →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-white/20 text-[11px] font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={googleBusy}
            className="w-full py-2.5 bg-white/[0.03] border border-white/[0.08] text-white/80 font-medium text-[14px] rounded-xl hover:bg-white/[0.06] active:opacity-90 transition-all duration-150 flex items-center justify-center gap-2.5 disabled:opacity-50"
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
            {googleBusy ? "Continuing..." : "Continue with Google"}
          </button>

          {!isCreate && (
            <p className="text-center text-white/25 text-[13px] mt-4">
              <Link href="/forgot-password" className="hover:text-white/40 transition">
                Forgot password?
              </Link>
            </p>
          )}
        </div>

        <p className="text-center text-white/30 text-[13px]">
          {isCreate ? (
            <>
              Already have an account?{" "}
              <Link href="/sign-in" className="text-white/60 hover:text-white transition">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to Recall Touch?{" "}
              <Link href="/sign-in?create=1" className="text-white/60 hover:text-white transition">
                Create free account →
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
