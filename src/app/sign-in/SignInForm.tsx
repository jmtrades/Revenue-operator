"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getClientOrNull } from "@/lib/supabase/client";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const isCreateMode = searchParams.get("create") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);

    // Create account: call signup API
    if (isCreateMode) {
      if (!password || password.length < 6) {
        setError("Please enter a password (at least 6 characters).");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmed,
            password,
            businessName: businessName.trim() || "My Workspace",
          }),
          credentials: "include",
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          window.location.href = "/app/activity";
          return;
        }
        setError(data.error ?? "Sign up failed.");
      } catch {
        setError("Something went wrong. Try again.");
      }
      setLoading(false);
      return;
    }

    // Sign-in: require password and call API
    if (!password || !password.trim()) {
      setError("Please enter your password.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, password: password.trim() }),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        window.location.href = "/app/activity";
        return;
      }
      const msg = data.error ?? "Sign-in failed.";
      setError(
        msg.includes("Invalid") || msg.includes("credentials")
          ? "Invalid email or password."
          : msg
      );
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
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
      setToast("Google sign-in is unavailable.");
    }
  };

  const handleForgotPassword = () => {
    setToast("Check your email.");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signin-email" className="block text-sm font-medium text-zinc-400 mb-1.5">Email address</label>
              <input
                id="signin-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                required
                aria-invalid={!!error}
                aria-describedby={error ? "signin-error" : undefined}
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="signin-password" className="block text-sm font-medium text-zinc-400 mb-1.5">
                {isCreateMode ? "Password (min 6 characters)" : "Password"}
              </label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isCreateMode ? "Choose a password" : ""}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                  autoComplete={isCreateMode ? "new-password" : "current-password"}
                  required
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
            {isCreateMode && (
              <div>
                <label htmlFor="signin-business" className="block text-sm font-medium text-zinc-400 mb-1.5">Business name (optional)</label>
                <input
                  id="signin-business"
                  type="text"
                  placeholder="My Workspace"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                  autoComplete="organization"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-100 transition disabled:opacity-60"
            >
              {loading ? (isCreateMode ? "Creating account…" : "Signing in…") : isCreateMode ? "Create account →" : "Sign in →"}
            </button>
          </form>
          {!isCreateMode && (
            <>
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
                <button type="button" onClick={handleForgotPassword} className="text-xs text-zinc-500 hover:text-zinc-400" aria-label="Forgot password? We will send reset instructions to your email.">
                  Forgot password?
                </button>
              </p>
            </>
          )}
          {isCreateMode && (
            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-white hover:underline font-medium">Sign in</Link>
            </p>
          )}
      {error && (
        <div id="signin-error" role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-center">
          <p className="text-sm text-red-200">{error}</p>
          {(error.includes("Invalid") || error.includes("No account") || error.includes("password")) && (
            <Link href="/sign-in?create=1" className="inline-block mt-2 text-sm font-medium text-white underline">
              Create account →
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
