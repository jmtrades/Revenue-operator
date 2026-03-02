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
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setAuthAvailable(getClientOrNull() !== null), 0);
    return () => clearTimeout(id);
  }, []);

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
    setError("No account found for this email. Sign up first to continue.");
  };

  const handleGoogle = async () => {
    const supabase = getClientOrNull();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
  };

  // Auth not configured: show "Sign in is coming soon" with CTA (no blank/loading)
  if (authAvailable === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Sign in is coming soon. In the meantime, get started with call handling — it takes about 5 minutes.
          </p>
          <Link
            href="/activate"
            className="inline-block w-full max-w-[280px] py-3 px-4 rounded-lg font-medium text-sm text-center no-underline"
            style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}
          >
            Get started →
          </Link>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            <Link href="/" className="underline">Back to home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-semibold text-center">Welcome back</h1>
        {sent ? (
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            Check your email for the sign-in link.
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="signin-email" className="sr-only">Email</label>
                <input
                  id="signin-email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                  required
                />
              </div>
              <div>
                <label htmlFor="signin-password" className="sr-only">Password</label>
                <input
                  id="signin-password"
                  type="password"
                  placeholder="Password"
                  className="w-full px-4 py-2 rounded-lg border text-sm"
                  style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg font-medium text-sm"
                style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}
              >
                {loading ? "Sending…" : "Sign in →"}
              </button>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: "var(--border-default)" }} />
              </div>
              <div className="relative flex justify-center text-xs" style={{ color: "var(--text-tertiary)" }}>
                or
              </div>
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-2 rounded-lg border font-medium text-sm"
              style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
            >
              Continue with Google
            </button>
          </>
        )}
        {error && (
          <p className="text-sm text-center" style={{ color: "var(--meaning-red)" }}>
            {error}
          </p>
        )}
        {error && (
          <p className="text-center text-sm">
            <Link href="/activate" className="underline" style={{ color: "var(--accent-primary)" }}>Sign up first →</Link>
          </p>
        )}
        <p className="text-center text-sm space-y-1" style={{ color: "var(--text-tertiary)" }}>
          <span className="block">Don&apos;t have an account? <Link href="/activate" className="underline">Start free →</Link></span>
          <span className="block">Forgot password? <Link href="/activate" className="underline">Reset it →</Link></span>
          <span className="block mt-2"><Link href="/" className="underline">Back to home</Link></span>
        </p>
      </div>
    </div>
  );
}
