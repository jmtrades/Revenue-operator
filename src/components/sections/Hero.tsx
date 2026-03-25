"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
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
      setCallError(t("invalidPhone"));
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
            placeholder={t("placeholder")}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{
                background: "var(--accent-primary-subtle)",
                color: "var(--accent-primary)",
                border: "1px solid rgba(37, 99, 235, 0.1)",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0, ease: [0.23, 1, 0.32, 1] }}
            >
              {t("badge")}
            </motion.div>

            <motion.h1
              className="font-semibold max-w-xl mb-5"
              style={{
                fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
                letterSpacing: "-0.035em",
                lineHeight: 1.08,
                color: "var(--text-primary)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
            >
              {t("heading1")}{" "}
              <br className="hidden sm:block" />
              {t("heading2")}{" "}
              <br className="hidden sm:block" />
              {t("heading3")}
            </motion.h1>

            <motion.p
              className="text-base md:text-[1.125rem] max-w-lg mb-5 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.23, 1, 0.32, 1] }}
            >
              {t("description")}
            </motion.p>

            {/* Social proof ABOVE CTAs — builds trust before the ask */}
            <motion.div
              className="flex flex-wrap items-center gap-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="var(--accent-warning, #F59E0B)">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
                <span className="text-xs ml-1" style={{ color: "var(--text-tertiary)" }}>4.9/5</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                <strong style={{ color: "var(--text-secondary)" }}>{SOCIAL_PROOF.businessCount}</strong> {t("socialProof")}
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                <strong style={{ color: "var(--text-secondary)" }}>{SOCIAL_PROOF.revenueRecovered}</strong> {t("socialProofRecovered")}
              </span>
            </motion.div>

            {/* CTAs — primary is blue (highest contrast, highest conversion) */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32, ease: [0.23, 1, 0.32, 1] }}
            >
              <Link
                href={ROUTES.START}
                className="btn-marketing-blue btn-lg group no-underline flex items-center justify-center gap-2 w-full sm:w-auto active:scale-[0.97]"
              >
                {t("startFreeTrial")}
                <ArrowRight className="w-4 h-4" style={{ transition: "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)" }} />
              </Link>
              <Link
                href="/demo"
                className="btn-marketing-ghost btn-lg no-underline flex items-center justify-center w-full sm:w-auto active:scale-[0.97]"
              >
                {t("watchDemo")}
              </Link>
            </motion.div>
            <motion.p
              className="text-xs mb-5"
              style={{ color: "var(--text-tertiary)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {t("creditCard")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.48, ease: [0.23, 1, 0.32, 1] }}
            >
              <HeroVoiceDemo />
            </motion.div>
          </motion.div>

          {/* Right: Dashboard preview card */}
          <motion.div
            className="max-w-md lg:ml-auto w-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <motion.div
              className="rounded-2xl p-6"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
                transition: "box-shadow 300ms cubic-bezier(0.23, 1, 0.32, 1), transform 300ms cubic-bezier(0.23, 1, 0.32, 1)"
              }}
              whileHover={{ y: -4 }}
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
            </motion.div>
          </motion.div>
        </div>

        {/* Compliance bar */}
        <motion.div
          className="max-w-4xl mx-auto mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link href="/security" className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium no-underline hover:opacity-80" style={{ color: "var(--text-tertiary)", transition: "opacity 200ms ease" }}>
            {t.raw("compliance").map((label: string) => (
              <span key={label} className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" style={{ color: "var(--accent-secondary)" }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/>
                </svg>
                {label}
              </span>
            ))}
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}
