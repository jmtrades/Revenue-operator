"use client";

/**
 * Phase 80 — Landing page rebuild.
 *
 * Design choice (picked from 10 concepts): ROI-calculator-first hero.
 * The core pitch is "you're losing revenue you don't know about." A live,
 * personalised dollar figure converts that abstract claim into a 5-second
 * self-computed proof. The audio demo is folded in as the "now hear the
 * thing that closes the gap" moment.
 *
 * Visual anchors, in order:
 *   1. Editorial headline + sub
 *   2. Two-column result panel — left: the leak (sliders + live $/mo lost);
 *      right: the recovery (animated $/mo recovered + voice demo)
 *   3. Primary CTA, outcome-bound ("Recover $X/mo → Get started")
 *   4. Social-proof strip
 *
 * Reuses existing i18n keys from marketing.hero, marketing.hero.voiceDemo,
 * and homepage.roiCalculator — so no locale files need to be updated.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Pause,
  Phone,
  PhoneCall,
  Play,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES, SOCIAL_PROOF } from "@/lib/constants";

/** Deal-value presets for the "close-rate" input — tap-friendly, no free text. */
const AVG_VALUE_OPTIONS = [
  { label: "$200", value: 200 },
  { label: "$500", value: 500 },
  { label: "$1,000", value: 1000 },
  { label: "$2,500", value: 2500 },
  { label: "$5,000", value: 5000 },
  { label: "$10,000+", value: 10000 },
] as const;

/** Inline audio samples — kept identical to the previous hero for continuity. */
const HERO_DEMO_SAMPLES = [
  "Hi there, thanks so much for calling! This is Sarah. I'd love to help you out today. We actually have a couple openings tomorrow morning and Thursday afternoon, which one works better for you?",
  "Absolutely, let me pull that right up for you. Okay, so your appointment's confirmed for Wednesday at two. I'll send you a quick text reminder the day before. Is there anything else I can help you with?",
  "Oh, I totally understand, and I'm really sorry about that. Let me get this taken care of for you right away. I'm going to connect you with someone who can get this resolved today, sound good?",
] as const;

/** Assumed recovery rate once a Revenue Operator is actually running.
 *  Tuned conservatively to avoid over-promising; the evidence doc for this
 *  phase justifies 70% from aggregated call-data baselines. */
const RECOVERY_RATE = 0.7;
const BUSINESS_PLAN_USD = 297;

function formatMoney(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/**
 * Animates a number from its previous value to the target over ~500ms using
 * requestAnimationFrame. Keeps the "the math is happening live" feel without
 * introducing a motion library.
 */
function useAnimatedNumber(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const duration = 500;

    let raf = 0;
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic — settles quickly, no overshoot
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // `display` intentionally excluded — we only rerun on target change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

/**
 * The voice-demo block (phone input + play sample) — kept in a subcomponent
 * so the calculator column doesn't need to track audio state.
 */
function HeroVoicePanel() {
  const t = useTranslations("marketing.hero.voiceDemo");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sampleIndexRef = useRef(0);
  const [phone, setPhone] = useState("");
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callLoading, setCallLoading] = useState(false);

  const playSample = useCallback(async (text: string) => {
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
    } catch {
      /* No robot-TTS fallback — better to show nothing than a bad voice. */
    }
    setPlaying(false);
    return false;
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlaying(false);
      return;
    }
    setLoading(true);
    const text = HERO_DEMO_SAMPLES[sampleIndexRef.current % HERO_DEMO_SAMPLES.length];
    sampleIndexRef.current += 1;
    const ok = await playSample(text);
    if (ok) setPlaying(true);
    setLoading(false);
  }, [playing, playSample]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
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
        if (data.callback_requested) {
          setCallStatus("Thanks! Our team will call you shortly.");
        } else {
          setCallStatus(
            data.message ?? "Pick up your phone — your AI operator is calling you now."
          );
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={loading}
          aria-pressed={playing}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors active:scale-[0.97]"
          style={{
            background: playing
              ? "var(--accent-danger-subtle)"
              : "var(--bg-hover)",
            color: playing ? "var(--accent-danger)" : "var(--text-primary)",
            border: `1px solid ${
              playing ? "rgba(220,38,38,0.2)" : "var(--border-default)"
            }`,
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
          <div className="flex items-center gap-[3px] h-4" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  height: "12px",
                  background: "var(--text-tertiary)",
                  animation: `heroWave ${0.35 + i * 0.08}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <PhoneCall
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDemoCall()}
            placeholder="+1 (555) 123-4567"
            aria-label="Phone number for demo call"
            className="w-full pl-9 pr-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-btn)",
              transition:
                "border-color 120ms cubic-bezier(0.23,1,0.32,1), box-shadow 120ms cubic-bezier(0.23,1,0.32,1)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleDemoCall}
          disabled={callLoading || callStatus !== null}
          className="btn-marketing-primary px-4 py-2.5 text-sm whitespace-nowrap active:scale-[0.97] transition-opacity"
          style={{
            opacity: callLoading || callStatus !== null ? 0.7 : 1,
          }}
        >
          {callLoading ? t("calling") : callStatus ? "✓ " + t("calling") : t("demoCall")}
        </button>
      </div>

      {callStatus && (
        <p
          className="text-xs flex items-center gap-1.5"
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
          className="text-xs"
          style={{
            color: "var(--accent-danger)",
            animation: "fadeIn 300ms ease-out",
          }}
        >
          {callError}
        </p>
      )}
      <p
        className="text-[11px] leading-relaxed"
        style={{ color: "var(--text-tertiary)" }}
      >
        {t("disclaimer")}
      </p>
    </div>
  );
}

export function Hero() {
  const t = useTranslations("marketing.hero");
  const tCalc = useTranslations("homepage.roiCalculator");

  // Sensible starting point: 220 opps/mo × $1,000 × 22% leak reflects a
  // mid-market SMB the product is tuned for. Visitors self-adjust.
  const [monthlyOpportunities, setMonthlyOpportunities] = useState(220);
  const [avgDealValue, setAvgDealValue] = useState(1000);
  const [revenueGapPct, setRevenueGapPct] = useState(22);

  const { monthlyLost, monthlyRecovered, paysForItself } = useMemo(() => {
    const opportunities = Math.max(0, Math.min(4000, monthlyOpportunities));
    const value = Math.max(200, avgDealValue);
    const gap = Math.max(0, Math.min(80, revenueGapPct)) / 100;
    const lost = opportunities * gap * value;
    const recovered = lost * RECOVERY_RATE;
    const pays = recovered / BUSINESS_PLAN_USD;
    return { monthlyLost: lost, monthlyRecovered: recovered, paysForItself: pays };
  }, [avgDealValue, revenueGapPct, monthlyOpportunities]);

  const animatedLost = useAnimatedNumber(monthlyLost);
  const animatedRecovered = useAnimatedNumber(monthlyRecovered);

  return (
    <section
      className="hero-atmosphere relative pt-24 pb-16 md:pt-32 md:pb-20"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container className="relative z-10">
        {/* Top: editorial headline + sub, centered, confident scale */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-5"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("badge")}
          </p>
          <h1
            className="font-semibold mb-5"
            style={{
              fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
              color: "var(--text-primary)",
            }}
          >
            {t("heading1")}
            <br className="hidden sm:block" /> {t("heading2")}
          </h1>
          <p
            className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("description")}
          </p>
        </div>

        {/* Main two-column result panel */}
        <div
          className="max-w-5xl mx-auto rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left column — the leak */}
            <div
              className="p-6 md:p-8"
              style={{ borderRight: "1px solid var(--border-default)" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--accent-danger-subtle)",
                    color: "var(--accent-danger)",
                  }}
                >
                  <TrendingDown className="w-4 h-4" />
                </div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {tCalc("sectionLabel")}
                </p>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {tCalc("sliderMonthlyOpportunitiesLabel")}
                    </span>
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {monthlyOpportunities}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    step={10}
                    value={monthlyOpportunities}
                    onChange={(event) =>
                      setMonthlyOpportunities(Number(event.target.value))
                    }
                    className="w-full h-1.5 rounded-lg cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {tCalc("sliderRevenueGapLabel")}
                    </span>
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {revenueGapPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={1}
                    value={revenueGapPct}
                    onChange={(event) =>
                      setRevenueGapPct(Number(event.target.value))
                    }
                    className="w-full h-1.5 rounded-lg cursor-pointer"
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                </label>

                <div>
                  <span
                    className="text-sm font-medium block mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tCalc("sliderAverageDealValueLabel")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {AVG_VALUE_OPTIONS.map((opt) => {
                      const selected = avgDealValue === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: selected
                              ? "var(--accent-primary)"
                              : "transparent",
                            color: selected
                              ? "var(--text-on-accent)"
                              : "var(--text-secondary)",
                            border: `1px solid ${
                              selected
                                ? "var(--accent-primary)"
                                : "var(--border-default)"
                            }`,
                          }}
                          onClick={() => setAvgDealValue(opt.value)}
                          aria-pressed={selected}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className="mt-6 pt-5"
                style={{ borderTop: "1px solid var(--border-default)" }}
              >
                <p
                  className="text-xs uppercase tracking-wider mb-1.5 font-semibold"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Monthly revenue leak
                </p>
                <p
                  className="font-semibold tabular-nums"
                  style={{
                    fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)",
                    color: "var(--accent-danger)",
                    letterSpacing: "-0.025em",
                  }}
                  aria-live="polite"
                >
                  ${formatMoney(animatedLost)}
                  <span
                    className="text-sm font-medium ml-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    /mo
                  </span>
                </p>
              </div>
            </div>

            {/* Right column — the recovery + voice demo */}
            <div
              className="p-6 md:p-8"
              style={{ background: "var(--bg-inset)" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--accent-secondary-subtle)",
                    color: "var(--accent-secondary)",
                  }}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  With Revenue Operator
                </p>
              </div>

              <p
                className="text-xs uppercase tracking-wider mb-1.5 font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                Recovered / month
              </p>
              <p
                className="font-semibold tabular-nums mb-1"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  color: "var(--accent-secondary)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                }}
                aria-live="polite"
              >
                ${formatMoney(animatedRecovered)}
              </p>
              <p
                className="text-xs mb-5"
                style={{ color: "var(--text-secondary)" }}
              >
                ≈ ${formatMoney(animatedRecovered * 12)} / year
                {paysForItself >= 1 ? (
                  <>
                    {" · "}
                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {paysForItself.toFixed(1)}× ROI
                    </span>
                  </>
                ) : null}
              </p>

              <Link
                href={ROUTES.START}
                className="btn-marketing-primary btn-lg no-underline w-full flex items-center justify-center gap-2 active:scale-[0.97]"
              >
                {t("getStarted")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p
                className="text-[11px] text-center mt-2 mb-6"
                style={{ color: "var(--text-tertiary)" }}
              >
                {t("creditCard")}
              </p>

              <div
                className="pt-5"
                style={{ borderTop: "1px solid var(--border-default)" }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Hear it work
                </p>
                <HeroVoicePanel />
              </div>
            </div>
          </div>
        </div>

        {/* Social-proof strip */}
        <div className="max-w-5xl mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: "var(--text-secondary)" }}
          >
            {SOCIAL_PROOF.revenueRecovered}
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {t("socialProofRecovered")}
          </span>
          <span
            className="hidden sm:block text-xs"
            style={{ color: "var(--border-default)" }}
          >
            •
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {t("coverage24_7")} {t("coverageLabel").toLowerCase()}
          </span>
          <span
            className="hidden sm:block text-xs"
            style={{ color: "var(--border-default)" }}
          >
            •
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {t("responseTime")} {t("responseLabel").toLowerCase()}
          </span>
        </div>
      </Container>
    </section>
  );
}
