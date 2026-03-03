"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getClientOrNull } from "@/lib/supabase/client";

function getSignupEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup") ?? localStorage.getItem("recall_touch_activate");
    if (!raw) return null;
    const d = JSON.parse(raw) as { email?: string };
    return d?.email?.trim() ?? null;
  } catch {
    return null;
  }
}

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    const trimmed = email.trim().toLowerCase();
    setLoading(true);
    setError(null);

    const signupEmail = getSignupEmail();
    if (signupEmail && signupEmail.toLowerCase() === trimmed) {
      try {
        localStorage.setItem("rt_session", "true");
        localStorage.setItem("rt_authenticated", "true");
      } catch {
        // ignore
      }
      setLoading(false);
      router.push("/app");
      return;
    }

    const supabase = getClientOrNull();
    if (supabase) {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback` },
      });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
      return;
    }

    setLoading(false);
    setError("No account found. Start free →");
  };

  const handleGoogle = () => {
    const supabase = getClientOrNull();
    if (supabase) {
      setLoading(true);
      setError(null);
      void supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback` },
      }).then((result: { error?: { message: string } | null }) => {
        setLoading(false);
        if (result.error) setError(result.error.message);
      });
    } else {
      setToast("Google sign-in requires setup — use email for now");
    }
  };

  const handleForgotPassword = () => {
    setToast("Check your email");
  };

  return (
    <div className="space-y-4">
      {sent ? (
        <p className="text-sm text-center text-zinc-400">
          Check your email for the sign-in link.
        </p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signin-email" className="block text-xs font-medium text-zinc-500 mb-1">Email address</label>
              <input
                id="signin-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="signin-password" className="block text-xs font-medium text-zinc-500 mb-1">Password</label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-100 transition disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs text-zinc-500">or</div>
          </div>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium text-sm border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition"
          >
            Continue with Google
          </button>
          <p className="text-center">
            <button type="button" onClick={handleForgotPassword} className="text-xs text-zinc-500 hover:text-zinc-400">
              Forgot password?
            </button>
          </p>
        </>
      )}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-center">
          <p className="text-sm text-red-200">{error}</p>
          {error.includes("No account") && (
            <Link href="/activate" className="inline-block mt-2 text-sm font-medium text-white underline">
              Get started free →
            </Link>
          )}
        </div>
      )}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200 animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}
    </div>
  );
}
