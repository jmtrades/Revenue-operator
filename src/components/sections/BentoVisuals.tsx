"use client";

import { Check } from "lucide-react";
import { Phone, MessageSquare, CreditCard } from "lucide-react";

/** Card 1: Call governance — waveform bars (spec: viewBox 240×56, 32 bars, active index 10) */
export function WaveformVisual() {
  const bars = Array.from({ length: 32 }, (_, i) => {
    const h = 14 + Math.sin(i * 0.45) * 18 + Math.sin(i * 1.2) * 10 + Math.sin(i * 0.7) * 6;
    return Math.max(4, Math.min(52, h));
  });
  const activeIndex = 10;
  return (
    <div className="mt-auto pt-6" aria-hidden="true">
      <svg viewBox="0 0 240 56" className="w-full h-14 opacity-50 group-hover:opacity-70 transition-opacity duration-300" preserveAspectRatio="none">
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 7.2 + 2}
            y={56 - h}
            width={3}
            height={h}
            rx={1.5}
            className={i === activeIndex ? "fill-[var(--accent-primary)]" : "fill-[var(--accent-primary)] opacity-25"}
            style={i === activeIndex ? { filter: "drop-shadow(0 0 6px var(--accent-primary))" } : undefined}
          />
        ))}
        <line x1={0} y1={55.5} x2={240} y2={55.5} className="stroke-[var(--border-default)]" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

/** Card 2: Automated follow-ups — horizontal timeline */
const TIMELINE_STEPS = [
  { label: "Call", time: "09:14", filled: true },
  { label: "Follow-up", time: "+24h", filled: true },
  { label: "Confirm", time: "+48h", filled: false },
  { label: "Close", time: "+72h", filled: false },
];

export function TimelineVisual() {
  return (
    <div className="mt-auto pt-6 flex items-end justify-between gap-2 opacity-60 group-hover:opacity-80 transition-opacity" aria-hidden>
      {TIMELINE_STEPS.map((step, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className="flex items-center w-full">
            {i > 0 && (
              <div className="flex-1 h-px min-w-2" style={{ background: "var(--border-default)" }} />
            )}
            <div
              className="shrink-0 w-2 h-2 rounded-full"
              style={{
                background: step.filled ? "var(--accent-primary)" : "transparent",
                border: step.filled ? "none" : "1.5px solid var(--text-tertiary)",
              }}
            />
            {i < TIMELINE_STEPS.length - 1 && (
              <div className="flex-1 h-px min-w-2" style={{ background: "var(--border-default)" }} />
            )}
          </div>
          <span className="text-[10px] mt-2 block" style={{ color: "var(--text-tertiary)" }}>{step.label}</span>
          <span className="text-[10px] font-mono block" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{step.time}</span>
        </div>
      ))}
    </div>
  );
}

/** Card 3: Compliance record — record preview box */
export function ComplianceRecordPreview() {
  return (
    <div
      className="mt-auto rounded-lg border p-6 opacity-90 group-hover:opacity-100 transition-opacity"
      style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}
      aria-hidden
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-secondary)" }}>
          Governed record
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          REF-2024-0847
        </span>
      </div>
      <div className="my-3 h-px" style={{ background: "var(--border-default)" }} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
        <span style={{ color: "var(--text-tertiary)" }}>Jurisdiction</span>
        <span style={{ color: "var(--text-primary)" }}>US-CA</span>
        <span style={{ color: "var(--text-tertiary)" }}>Verified</span>
        <span style={{ color: "var(--text-secondary)" }}>2024-01-15T09:14:00Z</span>
        <span style={{ color: "var(--text-tertiary)" }}>Review depth</span>
        <span style={{ color: "var(--text-primary)" }}>Standard</span>
        <span style={{ color: "var(--text-tertiary)" }}>Duration</span>
        <span style={{ color: "var(--text-secondary)" }}>4m 32s</span>
        <span style={{ color: "var(--text-tertiary)" }}>Status</span>
        <span className="flex items-center gap-1" style={{ color: "var(--accent-secondary)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block animate-pulse" /> Compliant
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>Chain</span>
        <span style={{ color: "var(--text-secondary)" }}>3 verified events</span>
      </div>
      <div className="my-3 h-px" style={{ background: "var(--border-default)" }} />
      <div className="space-y-1.5">
        {["Recorded under declared jurisdiction", "Forwarded without modification", "Audit trail complete"].map((line, i) => (
          <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <Check className="w-3 h-3 shrink-0" style={{ color: "var(--accent-secondary)" }} />
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card 4: Escalation control — L1 → L2 → L3 flow */
export function EscalationFlowVisual() {
  const levels = [
    { id: "L1", label: "Agent", active: false },
    { id: "L2", label: "Manager", active: true },
    { id: "L3", label: "Director", active: false },
  ];
  return (
    <div className="mt-auto pt-6 flex items-center justify-center gap-4 opacity-60 group-hover:opacity-80 transition-opacity" aria-hidden>
      {levels.map((level, i) => (
        <div key={level.id} className="flex items-center">
          {i > 0 && (
            <svg width={24} height={12} className="shrink-0" style={{ color: "var(--border-default)" }}>
              <line x1={0} y1={6} x2={20} y2={6} stroke="currentColor" strokeWidth={1} />
              <path d="M18 4 L22 6 L18 8 Z" fill="currentColor" />
            </svg>
          )}
          <div className="flex flex-col items-center">
            <div
              className="w-10 h-7 rounded flex items-center justify-center text-[11px] font-semibold font-mono"
              style={{
                background: level.active ? "var(--accent-warning-subtle)" : "var(--bg-elevated)",
                border: `1px solid ${level.active ? "var(--accent-warning)" : "var(--border-default)"}`,
                color: level.active ? "var(--accent-warning)" : "var(--text-tertiary)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                boxShadow: level.active ? "0 0 12px rgba(255,178,36,0.15)" : undefined,
              }}
            >
              {level.id}
            </div>
            <span className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{level.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Card 5: Multi-channel — channel icons row */
export function ChannelIconsVisual() {
  const channels = [
    { icon: Phone, label: "Voice" },
    { icon: MessageSquare, label: "Message" },
    { icon: CreditCard, label: "Payment" },
  ];
  return (
    <div className="mt-auto pt-6 flex flex-col items-center gap-3 opacity-60 group-hover:opacity-80 transition-opacity" aria-hidden>
      <div className="flex items-center justify-center gap-8">
        {channels.map((ch, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
            >
              <ch.icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>
      <span className="text-[10px]" style={{ color: "var(--accent-secondary)" }}>Single governance layer</span>
    </div>
  );
}
