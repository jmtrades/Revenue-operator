"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES } from "@/lib/constants";
import { ArrowRight, Play, Pause, Phone, Star, Shield, Users, Volume2, PhoneCall } from "lucide-react";

const USE_CASES = [
  "Answers every call in under 1 second — 24/7/365",
  "Sounds so human, 90% of callers don't know it's AI",
  "Books appointments directly into your calendar",
  "Follows up on every lead until the deal closes",
  "Recovers revenue from missed and after-hours calls",
  "Qualifies inbound leads before they go cold",
  "Runs outbound campaigns while you sleep",
  "Replaces your entire phone team at 1/10th the cost",
];

/* ── Inline Hero Voice Demo ── */
// Industry-neutral samples that showcase different capabilities — every visitor sees something relevant
const HERO_DEMO_SAMPLES = [
  "Hi, thanks for calling! This is Sarah. I'd love to help you today. We have a few openings tomorrow morning and Thursday afternoon — which works better for you?",
  "Of course — let me pull that up for you. So it looks like your appointment is confirmed for Wednesday at 2 PM. I'll send you a text reminder the day before. Anything else I can help with?",
  "I completely understand that's frustrating. Let me get this taken care of right away. I'm going to connect you with someone who can resolve this today — one moment.",
] as const;

function HeroVoiceDemo() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sampleIndexRef = useRef(0);
  const [phone, setPhone] = useState("");
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callLoading, setCallLoading] = useState(false);

  const playWithFallback = useCallback(async (text: string) => {
    try {
      const res = await fetch(
        `/api/demo/voice-preview?voice_id=us-female-warm-receptionist&text=${encodeURIComponent(text)}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setPlaying(false);
          audioRef.current = null;
        };
        await audio.play();
        return true;
      }
    } catch {
      // Fall through to browser TTS
    }
    // Browser TTS fallback — always works
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.onend = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
      return true;
    }
    return false;
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    setLoading(true);
    // Rotate through samples so each click plays something new
    const text = HERO_DEMO_SAMPLES[sampleIndexRef.current % HERO_DEMO_SAMPLES.length];
    sampleIndexRef.current += 1;
    const ok = await playWithFallback(text);
    if (ok) setPlaying(true);
    setLoading(false);
  }, [playing, playWithFallback]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handleDemoCall = async () => {
    const value = phone.trim();
    const digits = value.replace(/\D/g, "");
    if (!value || digits.length < 10 || digits.length > 15) {
      setCallError("Enter a valid phone number with area code.");
      return;
    }
    setCallLoading(true);
    setCallStatus(null);
    setCallError(null);
    try {
      const res = await fetch("/api/demo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: value }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (res.ok && data.ok) {
        setCallStatus(data.message ?? "Calling you now! Pick up to hear it live.");
      } else {
        setCallError(data.error ?? "Could not start the call. Try again.");
      }
    } catch {
      setCallError("Could not connect. Please try again.");
    } finally {
      setCallLoading(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* One-click voice preview */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={loading}
          className="flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: playing
              ? "rgba(239,68,68,0.12)"
              : "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.08))",
            color: playing ? "rgb(248,113,113)" : "rgb(52,211,153)",
            border: `1px solid ${playing ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
          }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? "Loading..." : playing ? "Stop" : "Hear It Live"}
        </button>
        {playing && (
          <div className="flex items-center gap-[2px] h-5">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full bg-emerald-400"
                style={{
                  height: `${6 + Math.sin(i * 0.7) * 10}px`,
                  animation: `heroWave ${0.5 + (i % 4) * 0.12}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 35}ms`,
                }}
              />
            ))}
          </div>
        )}
        {!playing && !loading && (
          <span className="text-xs text-white/30 flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> 5-second preview
          </span>
        )}
      </div>

      {/* Phone demo CTA */}
      <div className="flex flex-col sm:flex-row gap-2 max-w-sm">
        <div className="relative flex-1">
          <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDemoCall()}
            placeholder="(555) 123-4567"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={handleDemoCall}
          disabled={callLoading}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {callLoading ? "Calling..." : "Call Me Now"}
        </button>
      </div>
      {callStatus && (
        <p className="text-xs text-emerald-300 flex items-center gap-1.5">
          <Phone className="w-3 h-3 animate-pulse" /> {callStatus}
        </p>
      )}
      {callError && (
        <p className="text-xs text-red-400">{callError}</p>
      )}
      <p className="text-[11px] text-white/25">
        Free · No signup · We&apos;ll call your phone in under 10 seconds
      </p>

      <style jsx>{`
        @keyframes heroWave {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

export function Hero() {
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTickerIndex((i) => (i + 1) % USE_CASES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="min-h-[80vh] flex items-center pt-24 pb-16 md:pt-28 md:pb-24 bg-[var(--bg-primary)]">
      <Container className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <SectionLabel>
              AI That Sounds Human. Results That Are Real.
            </SectionLabel>

            <h1
              className="font-bold max-w-xl mt-4 mb-4"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.2rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              Never Miss Another Call. Never Lose Another Dollar.
            </h1>

            <p className="text-base md:text-lg max-w-xl mb-5 text-[var(--text-secondary)] leading-relaxed">
              Recall Touch answers every call with a voice so human, 90% of callers don&apos;t know it&apos;s AI. It qualifies leads, books appointments, follows up, and recovers revenue — all on autopilot, 24/7, with 32 premium voices that sound like your best employee.
            </p>

            {/* Rotating use case ticker */}
            <div
              className="mb-6 h-8 flex items-center"
              aria-live="polite"
            >
              <span
                key={tickerIndex}
                className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border transition-opacity duration-500"
                style={{
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)",
                  background: "rgba(13,110,110,0.08)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {USE_CASES[tickerIndex]}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-2">
              <Link
                href={ROUTES.START}
                className="group bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center flex items-center justify-center gap-2"
              >
                Start free — no card needed
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Instant voice demo — hear it or get called in seconds */}
            <HeroVoiceDemo />

            {/* Inline Social Proof */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-xs ml-1 text-white/50">4.9/5</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                <strong className="text-white/70">12,400+</strong> businesses
              </span>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-xs text-white/50 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" />
                <strong className="text-white/70">8.7M+</strong> calls handled
              </span>
            </div>
          </div>

          <div className="max-w-md lg:ml-auto">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 shadow-[var(--shadow-glow-primary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                Live Revenue Dashboard
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                See every answered call, booked appointment, and dollar recovered — in real time.
              </p>
              <HeroRevenueWidget />
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border-default)" }}>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>24/7</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Coverage</p>
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&lt;0.8s</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Response</p>
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: "var(--accent-primary)" }}>32+</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Human-Quality Voices</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof bar */}
        <div className="max-w-4xl mx-auto mt-12 text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> SOC 2 Type II
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> HIPAA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> TCPA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> GDPR Ready
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400/60" /> 256-bit Encryption
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Trusted by 12,400+ businesses recovering revenue across 47 states
          </p>
        </div>
      </Container>
    </section>
  );
}
