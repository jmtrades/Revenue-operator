"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES, SOCIAL_PROOF } from "@/lib/constants";
import { ArrowRight, Play, Pause, Phone, PhoneCall } from "lucide-react";


const HERO_DEMO_SAMPLES = [
  "Hi there, thanks so much for calling! This is Sarah. I'd love to help you out today. We actually have a couple openings tomorrow morning and Thursday afternoon, which one works better for you?",
  "Absolutely, let me pull that right up for you. Okay, so your appointment's confirmed for Wednesday at two. I'll send you a quick text reminder the day before. Is there anything else I can help you with?",
  "Oh, I totally understand, and I'm really sorry about that. Let me get this taken care of for you right away. I'm going to connect you with someone who can get this resolved today, sound good?",
] as const;

function HeroVoiceDemo() {
  const t = useTranslations("marketing.hero.voiceDemo");
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
        `/api/demo/voice-preview?voice_id=us-female-warm-agent&text=${encodeURIComponent(text)}`
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
    } catch { /* API unavailable — do NOT fall back to robot browser TTS */ }
    // No fallback to speechSynthesis — better to show nothing than a robot voice
    setPlaying(false);
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
    if (!value || digits.length < 7 || digits.length > 15) {
      setCallError(t("phoneErrorMinDigits"));
      setCallStatus(null);
      return;
    }
    if (digits.startsWith("0") && !value.startsWith("+")) {
      setCallError(t("phoneErrorCountryCode"));
      setCallStatus(null);
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
        callback_requested?: boolean;
      };
      if (res.ok && data.ok) {
        // Use API message if available, with special handling for callback requests
        if (data.callback_requested) {
          setCallStatus("Thanks! Our team will call you shortly.");
        } else {
          setCallStatus(data.message ?? "Pick up your phone! Your AI operator is calling you now.");
        }
        setCallError(null);
      } else {
        setCallError(data.error ?? t("callError"));
        setCallStatus(null);
      }
    } catch {
      setCallError(t("connectionError"));
      setCallStatus(null);
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
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-medium transition-colors active:scale-[0.97]"
          style={{
            background: playing ? "var(--accent-danger-subtle)" : "var(--bg-hover)",
            color: playing ? "var(--accent-danger)" : "var(--text-primary)",
            border: `1px solid ${playing ? "rgba(220,38,38,0.2)" : "var(--border-default)"}`,
            transitionDuration: "120ms",
          }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {loading ? t("loading") : playing ? t("stopButton") : t("playButton")}
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
            placeholder="+1 (555) 123-4567"
            className="w-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-btn)",
              transition: "border-color 120ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 120ms cubic-bezier(0.23, 1, 0.32, 1)"
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleDemoCall}
          disabled={callLoading || callStatus !== null}
          className="btn-marketing-primary px-5 py-2.5 text-sm whitespace-nowrap active:scale-[0.97] transition-opacity"
          style={{
            opacity: callLoading || callStatus !== null ? 0.7 : 1,
          }}
        >
          {callLoading ? t("calling") : callStatus ? "✓ " + t("calling") : t("demoCall")}
        </button>
      </div>
      {callStatus && (
        <p
          className="text-xs flex items-center gap-1.5 animate-fade-in"
          style={{
            color: "var(--accent-secondary)",
            animation: "fadeIn 300ms ease-out",
            fontWeight: 500,
          }}
        >
          <Phone className="w-3 h-3 animate-pulse" /> {callStatus}
        </p>
      )}
      {callError && (
        <p
          className="text-xs animate-fade-in"
          style={{
            color: "var(--accent-danger)",
            animation: "fadeIn 300ms ease-out",
          }}
        >
          {callError}
        </p>
      )}
      <p className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
        {t("countryCodesHint")}
      </p>
      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        {t("disclaimer")}
      </p>

    </div>
  );
}

export function Hero() {
  const t = useTranslations("marketing.hero");

  return (
    <section
      className="hero-atmosphere relative pt-28 pb-16 md:pt-36 md:pb-24"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container className="relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div>
            <h1
              className="font-semibold max-w-xl mb-5"
              style={{
                fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                color: "var(--text-primary)",
              }}
            >
              {t("heading1")}{" "}
              <br className="hidden sm:block" />
              {t("heading2")}{" "}
              <br className="hidden sm:block" />
              {t("heading3")}
            </h1>

            <p
              className="text-base md:text-[1.125rem] max-w-lg mb-5 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("description")}
            </p>

            {/* Social proof ABOVE CTAs — builds trust before the ask */}
            <div
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {SOCIAL_PROOF.revenueRecovered}
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {t("socialProofRecovered")}
              </span>
            </div>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-2"
            >
              <Link
                href={ROUTES.START}
                className="btn-marketing-primary btn-lg group no-underline flex items-center justify-center gap-2 w-full sm:w-auto active:scale-[0.97]"
              >
                {t("getStarted")}
                <ArrowRight className="w-4 h-4" style={{ transition: "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)" }} />
              </Link>
            </div>
            <p
              className="text-xs mb-5"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("creditCard")}
            </p>

            <div>
              <HeroVoiceDemo />
            </div>
          </div>

          {/* Right: Dashboard preview card */}
          <div
            className="max-w-md lg:ml-auto w-full"
          >
            <div
              className="rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-300"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {t("dashboardTitle")}
                </h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                  background: "var(--bg-hover)",
                  color: "var(--text-tertiary)",
                }}>
                  {t("dashboardPreview")}
                </span>
              </div>
              <HeroRevenueWidget />
              <div className="mt-4 pt-4 grid grid-cols-3 gap-3 text-center" style={{ borderTop: "1px solid var(--border-default)" }}>
                <div>
                  <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("coverage24_7")}</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("coverageLabel")}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("responseTime")}</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("responseLabel")}</p>
                </div>
                <div>
                  <p className="text-lg font-semibold" style={{ color: "var(--accent-primary)" }}>{t("voiceCount")}</p>
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("voiceLabel")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </Container>
    </section>
  );
}
