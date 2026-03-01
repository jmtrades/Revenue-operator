"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getClientOrNull } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthAvailable(getClientOrNull() !== null);
  }, []);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    const supabase = getClientOrNull();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback` },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
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

  // Auth not configured: show clean "Coming soon" with CTA to /activate (no blank/loading)
  if (authAvailable === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Account sign-in is coming soon. Get started by setting up call handling — it takes about 5 minutes.
          </p>
          <Link
            href="/activate"
            className="inline-block w-full max-w-[280px] py-3 px-4 rounded-lg font-medium text-sm text-center no-underline"
            style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}
          >
            Start free — set up call handling →
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
        <h1 className="text-xl font-semibold text-center">Sign in to Recall Touch</h1>
        {sent ? (
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            Check your email for the sign-in link.
          </p>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg font-medium text-sm"
                style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}
              >
                {loading ? "Sending…" : "Send magic link"}
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
              style={{ borderColor: "var(--border-default)" }}
            >
              Sign in with Google
            </button>
          </>
        )}
        {error && (
          <p className="text-sm text-center" style={{ color: "var(--meaning-red)" }}>
            {error}
          </p>
        )}
        <p className="text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
          <Link href="/" className="underline">Back to home</Link>
          {" · "}
          <Link href="/activate" className="underline">Start free</Link>
        </p>
      </div>
    </div>
  );
}
