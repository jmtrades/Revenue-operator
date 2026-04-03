"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { HeroRevenueWidget } from "@/components/sections/HeroRevenueWidget";
import { ROUTES, SOCIAL_PROOF } from "@/lib/constants";
import { ArrowRight, Play, Pause, Phone, PhoneCall, CheckCircle2 } from "lucide-react";


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
    } catch { /* API unavailable */ }
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
      setCallError("Please enter your full phone number with country code (e.g. +44 7911 123456)");
      return;
    }
    if (digits.startsWith("0") && !value.startsWith("+")) {
      setCallError("Please include your country code (e.g. +44 7911 123456 for UK, +61 412 345 678 for Australia)");
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
        setCallStatus(data.message ?? t("callStatus"));
      } else {
        setCallError(data.error ?? t("callError"));
      }
    } catch {
      setCallError(t("connectionError"));
    } finally {
      setCallLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Voice preview + phone input */}
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
          disabled={callLoading}
          className="btn-marketing-blue px-5 py-2.5 text-sm whitespace-nowrap active:scale-[0.97]"
        >
          {callLoading ? t("calling") : t("demoCall")}
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
      <p className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
        Include your country code: +44 (UK), +1 (US), +61 (AU), +49 (DE)
      </p>
      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        {t("disclaimer")}
      </p>
    </div>
  );
}

/* ── Animated counter for hero stats ── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  );
}

export function Hero() {
  const t = useTranslations("marketing.hero");

  return (
    <section
      className="hero-atmosphere relative pt-28 pb-12 md:pt-40 md:pb-20"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Subtle radial accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.06), transparent 70%)",
        }}
      />

      <Container className="relative z-10">
        {/* Two-column layout */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Copy + CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  background: "var(--bg-hover)",
                  color: "var(--accent-primary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--accent-secondary)" }}
                />
                Autonomous Revenue Platform
              </span>
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
              {t("heading1")}{" "}
              <br className="hidden sm:block" />
              {t("heading2")}{" "}
              <br className="hidden sm:block" />
              <span style={{ color: "var(--accent-primary)" }}>{t("heading3")}</span>
            </h1>

            <p
              className="text-base md:text-[1.125rem] max-w-lg mb-6 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("description")}
            </p>

            {/* Trust checkmarks */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-x-5 gap-y-1.5 mb-6">
              {[
                "Answers every call in < 1 second",
                "Books appointments autonomously",
                "Recovers missed revenue 24/7",
              ].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-secondary)" }} />
                  {item}
                </span>
              ))}
            </div>

            {/* Primary CTA */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-2">
              <Link
                href={ROUTES.START}
                className="btn-marketing-blue btn-lg group no-underline flex items-center justify-center gap-2 w-full sm:w-auto active:scale-[0.97]"
              >
                {t("getStarted")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/demo"
                className="btn-marketing-ghost btn-lg no-underline flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Watch Demo
                <Play className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
              {t("creditCard")}
            </p>

            {/* Voice demo */}
            <HeroVoiceDemo />
          </motion.div>

          {/* Right: Dashboard card + floating metrics */}
          <motion.div
            className="max-w-md lg:ml-auto w-full relative"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Floating metric — top right */}
            <motion.div
              className="absolute -top-4 -right-2 z-20 hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--accent-secondary)", animation: "breathing 2s ease-in-out infinite" }}
              />
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                <AnimatedNumber target={127} /> calls handled today
              </span>
            </motion.div>

            {/* Floating metric — bottom left */}
            <motion.div
              className="absolute -bottom-3 -left-4 z-20 hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="text-xs font-semibold" style={{ color: "var(--accent-secondary)" }}>
                +$<AnimatedNumber target={4820} />
              </span>
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                revenue recovered this week
              </span>
            </motion.div>

            {/* Main dashboard card */}
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
          </motion.div>
        </div>

        {/* Hero stats bar */}
        <motion.div
          className="max-w-4xl mx-auto mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          {[
            { value: 24, suffix: "/7", label: "Autonomous coverage" },
            { value: 36, suffix: "+", label: "Industry voices" },
            { value: 94, suffix: "%", label: "Appointment conversion" },
            { value: 50, suffix: "+", label: "States compliant" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p
                className="text-2xl md:text-3xl font-semibold"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
              >
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
