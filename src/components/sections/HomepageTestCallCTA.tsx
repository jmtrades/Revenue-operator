"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function HomepageTestCallCTA() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const helper = useMemo(
    () => "Enter your number and we’ll call you with a live AI demo — works worldwide.",
    []
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (!trimmed || digits.length < 7 || digits.length > 15) {
      setError("Please enter a valid phone number with your country code (e.g. +44 7911 123456)");
      return;
    }
    if (digits.startsWith("0") && !trimmed.startsWith("+")) {
      setError("Please include your country code (e.g. +44 7911 123456 for UK, +61 412 345 678 for Australia)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; message?: string }
        | { ok: false; error?: string };

      if (!json || json.ok !== true) {
        setError((json as { error?: string } | null)?.error ?? "Could not start the demo call. Please check your number and try again.");
        return;
      }

      setError(null);
      setSuccess(json.message ?? "Calling you now! Pick up to hear your AI operator.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="marketing-section" style={{ background: "var(--bg-base)" }}>
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Try it live</SectionLabel>
          <h2
            className="font-semibold"
            style={{
              fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Want a test call from your AI?
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {helper}
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/50 p-4 sm:p-5"
          >
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <label className="sr-only" htmlFor="test-call-phone">
                Phone number
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-black/20 px-4 py-3 flex-1">
                <Phone className="h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  id="test-call-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7911 123456"
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full bg-transparent outline-none text-sm text-white placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="bg-white text-black font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition-colors disabled:opacity-60"
              >
                {busy ? "Calling…" : "Call me now"}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-300 text-left">{error}</p>}
            {success && <p className="mt-3 text-sm text-emerald-400 text-left">{success}</p>}
            <p className="mt-3 text-xs text-white/45 text-left">
              Include your country code: +44 (UK), +1 (US), +61 (AU)
            </p>
          </form>
        </div>
      </Container>
    </section>
  );
}

