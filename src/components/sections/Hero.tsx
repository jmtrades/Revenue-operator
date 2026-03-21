"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES } from "@/lib/constants";
import { ArrowRight, Play, Pause, Phone, PhoneCall } from "lucide-react";


const HERO_DEMO_SAMPLES = [
  "Hi, thanks for calling! This is Sarah. I'd love to help you today. We have a few openings tomorrow morning and Thursday afternoon — which works better for you?",
  "Of course — let me pull that up for you. Your appointment is confirmed for Wednesday at 2 PM. I'll send you a text reminder the day before. Anything else I can help with?",
  "I completely understand. Let me get this taken care of right away. I'm going to connect you with someone who can resolve this today.",
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
    } catch { /* fall through */ }
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
    <div className="mt-8 space-y-3">
      {/* Voice preview + phone input row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md">
        <button
          type="button"
          onClick={togglePlay}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-medium transition-all"
          style={{
            background: playing ? "var(--accent-danger-subtle)" : "var(--bg-hover)",
            color: playing ? "var(--accent-danger)" : "var(--text-primary)",
            border: `1px solid ${playing ? "rgba(220,38,38,0.2)" : "var(--border-default)"}`,
          }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? "Loading..." : playing ? "Stop" : "Hear the voice"}
        </button>
        {playing && (
          <div className="flex items-center gap-[3px] h-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  height: "10px",
                  background: "var(--text-tertiary)",
                  animation: `heroWave ${0.4 + i * 0.1}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 max-w-md">
        <div className="relative flex-1">
          <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDemoCall()}
            placeholder="(555) 123-4567"
            className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-sm transition-colors focus:outline-none"
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleDemoCall}
          disabled={callLoading}
          className="btn-marketing-blue px-5 py-2.5 text-sm whitespace-nowrap"
        >
          {callLoading ? "Calling..." : "Get a demo call"}
        </button>
      </div>
      {callStatus && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--accent-secondary)" }}>
          <Phone className="w-3 h-3 animate-pulse" /> {callStatus}
        </p>
      )}
      {callError && (
        <p className="text-xs" style={{ color: "var(--accent-danger)" }}>{callError}</p>
      )}
      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        Free. No signup required. We call your phone in under 10 seconds.
      </p>

    </div>
  );
}

export function Hero() {

  return (
    <section
      className="hero-atmosphere relative pt-28 pb-16 md:pt-36 md:pb-24"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container className="relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{
              background: "var(--accent-primary-subtle)",
              color: "var(--accent-primary)",
              border: "1px solid rgba(37, 99, 235, 0.1)",
            }}>
              AI phone infrastructure for revenue teams
            </div>

            <h1
              className="font-semibold max-w-xl mb-5"
              style={{
                fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                color: "var(--text-primary)",
              }}
            >
              Every call answered.{" "}
              <br className="hidden sm:block" />
              Every lead followed up.{" "}
              <br className="hidden sm:block" />
              Every dollar recovered.
            </h1>

            <p
              className="text-base md:text-[1.125rem] max-w-lg mb-5 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Recall Touch runs your phone operation with AI that handles inbound,
              outbound, follow-up, and booking — 24/7. Natural voice quality.
              Real conversations. Full revenue attribution.
            </p>

            {/* Social proof ABOVE CTAs — builds trust before the ask */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="var(--accent-warning, #F59E0B)">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
                <span className="text-xs ml-1" style={{ color: "var(--text-tertiary)" }}>4.9/5</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                <strong style={{ color: "var(--text-secondary)" }}>12,400+</strong> businesses
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                <strong style={{ color: "var(--text-secondary)" }}>$340M+</strong> recovered
              </span>
            </div>

            {/* CTAs — primary is blue (highest contrast, highest conversion) */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-2">
              <Link
                href={ROUTES.START}
                className="btn-marketing-blue btn-lg group no-underline flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Start free trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/demo"
                className="btn-marketing-ghost btn-lg no-underline flex items-center justify-center w-full sm:w-auto"
              >
                Watch demo
              </Link>
            </div>
            <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
              No credit card required. Live in under 3 minutes.
            </p>

            <HeroVoiceDemo />
          </div>

          {/* Right: Dashboard preview card */}
          <div className="max-w-md lg:ml-auto w-full">
            <div
              className="rounded-2xl p-6 transition-shadow"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Revenue Dashboard
                </h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                  background: "var(--bg-hover)",
                  color: "var(--text-tertiary)",
                }}>
                  Preview
                </span>
              </div>
              <HeroRevenueWidget />
              <div className="mt-4 pt-4 grid grid-cols-3 gap-3 text-center" style={{ borderTop: "1px solid var(--border-default)" }}>
                <div>
                  <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>24/7</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Coverage</p>
                </div>
                <div>
                  <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>&lt;0.8s</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Response</p>
                </div>
                <div>
                  <p className="text-lg font-semibold" style={{ color: "var(--accent-primary)" }}>32</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>Voices</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance bar */}
        <div className="max-w-4xl mx-auto mt-16 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
            {["SOC 2 Type II", "HIPAA", "TCPA", "GDPR", "256-bit SSL"].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
