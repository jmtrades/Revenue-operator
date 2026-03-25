"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, Phone, Mic, Volume2, ChevronRight, Sparkles, Wrench, HeartPulse, Scale, Home, UtensilsCrossed, Building2, Dumbbell, Scissors, Car } from "lucide-react";

/* ─── Conversation Scripts ─── */
const SCENARIOS = [
  {
    id: "hvac",
    industry: "HVAC",
    label: "Emergency AC Repair",
    icon: Wrench,
    greeting: "Hi, thanks for calling Premier Comfort Heating and Air. This is Sarah, how can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Hi, thanks for calling Premier Comfort Heating and Air. This is Sarah, how can I help you today?", delay: 0 },
      { role: "caller" as const, text: "Yeah, my AC just stopped working and it's like 95 degrees in here. I need someone out here ASAP.", delay: 3200 },
      { role: "ai" as const, text: "Oh no, I completely understand — that sounds miserable, especially in this heat. Let me get you taken care of right away. I have a technician available this afternoon between 2 and 4. Would that work for you, or do you need something even sooner?", delay: 5000 },
      { role: "caller" as const, text: "This afternoon works. What's it gonna cost me?", delay: 4800 },
      { role: "ai" as const, text: "Great, I've got you locked in. The diagnostic visit is seventy-nine dollars, and that gets applied to any repair we do. Most AC issues like this run between one-fifty and three hundred, but our tech will give you the exact number before doing any work. No surprises. Can I grab your address to confirm the appointment?", delay: 6000 },
    ],
  },
  {
    id: "dental",
    industry: "Dental",
    label: "New Patient Booking",
    icon: HeartPulse,
    greeting: "Good morning, Bright Smile Dental, this is Emma. How can I make your day better?",
    conversation: [
      { role: "ai" as const, text: "Good morning, Bright Smile Dental, this is Emma. How can I make your day better?", delay: 0 },
      { role: "caller" as const, text: "Hi, I'm looking for a new dentist. Do you take Blue Cross Blue Shield?", delay: 3000 },
      { role: "ai" as const, text: "We sure do! Blue Cross Blue Shield is one of our most popular plans. Welcome to Bright Smile — you're going to love Dr. Chen. We actually have a new patient special right now: a full exam, cleaning, and X-rays for just forty-nine dollars with your insurance. Would you like to grab one of those appointments?", delay: 5500 },
      { role: "caller" as const, text: "Oh wow, that's a great deal. Yeah, what do you have available?", delay: 3200 },
      { role: "ai" as const, text: "Perfect! I have openings tomorrow at 10 AM or Thursday at 2:30 PM. Both are with Dr. Chen. Which works better for your schedule?", delay: 4500 },
      { role: "caller" as const, text: "Thursday at 2:30 sounds good.", delay: 2000 },
      { role: "ai" as const, text: "You're all set for Thursday at 2:30 with Dr. Chen. I'll text you a confirmation with the address and what to bring. And just so you know — we have complimentary coffee and Netflix in the waiting room. We like to make it easy. See you Thursday!", delay: 5500 },
    ],
  },
  {
    id: "legal",
    industry: "Legal",
    label: "Personal Injury Intake",
    icon: Scale,
    greeting: "Thank you for calling Roth and Associates. This is Alex. How may I assist you?",
    conversation: [
      { role: "ai" as const, text: "Thank you for calling Roth and Associates. This is Alex. How may I assist you?", delay: 0 },
      { role: "caller" as const, text: "I was in a car accident last week and I think I need a lawyer.", delay: 3000 },
      { role: "ai" as const, text: "I'm sorry to hear about your accident — I hope you're feeling okay. You've called the right place. Our attorneys specialize in auto accident cases and we work on contingency, which means you don't pay us anything unless we win your case. Can I ask you a couple quick questions so we can get you a free consultation?", delay: 6000 },
      { role: "caller" as const, text: "Sure, yeah.", delay: 1500 },
      { role: "ai" as const, text: "Great. Were you the driver or a passenger, and have you seen a doctor since the accident?", delay: 3500 },
      { role: "caller" as const, text: "I was driving. I went to the ER that night but haven't followed up yet.", delay: 3000 },
      { role: "ai" as const, text: "Okay, that's really helpful. I'd recommend following up with your doctor as soon as possible — it strengthens your case significantly. I have a consultation slot available tomorrow morning at 9 AM with Attorney Roth. He's recovered over twelve million dollars for clients in cases just like yours. Should I book that for you?", delay: 6500 },
    ],
  },
  {
    id: "roofing",
    industry: "Roofing",
    label: "Storm Damage Estimate",
    icon: Home,
    greeting: "Apex Roofing Group, this is Sarah. Thanks for calling — how can I help?",
    conversation: [
      { role: "ai" as const, text: "Apex Roofing Group, this is Sarah. Thanks for calling — how can I help?", delay: 0 },
      { role: "caller" as const, text: "We had that big storm last night and I think my roof got damaged. There's water coming in.", delay: 3500 },
      { role: "ai" as const, text: "Oh no, I'm so sorry to hear that. Water intrusion is something we want to address quickly before it causes more damage. The good news is we offer free storm damage inspections, and we work directly with your insurance company to handle the entire claims process. Can I get an inspector out to you today?", delay: 6000 },
      { role: "caller" as const, text: "Today would be amazing. How much is this going to run me?", delay: 2800 },
      { role: "ai" as const, text: "The inspection is completely free, and if it's storm damage, your homeowner's insurance typically covers the full repair or replacement. We've helped over two thousand homeowners in the area navigate their claims — our approval rate is ninety-four percent. I have a slot at 3 PM today. Can I grab your address?", delay: 6500 },
    ],
  },
  {
    id: "restaurant",
    industry: "Restaurant",
    label: "Reservation & Catering",
    icon: UtensilsCrossed,
    greeting: "Hi, thanks for calling Bella Notte Italian Kitchen. This is Emma, how can I help you?",
    conversation: [
      { role: "ai" as const, text: "Hi, thanks for calling Bella Notte Italian Kitchen. This is Emma, how can I help you?", delay: 0 },
      { role: "caller" as const, text: "I'd like to make a reservation for Saturday night, party of 8.", delay: 2800 },
      { role: "ai" as const, text: "Wonderful! Saturday night for 8 — let me check what we have. I can offer you our semi-private dining alcove at 7:30 PM, which is perfect for larger groups. You'll have your own space with a dedicated server. Would you like that?", delay: 5000 },
      { role: "caller" as const, text: "That sounds perfect. It's actually for a birthday — do you guys do anything special?", delay: 3000 },
      { role: "ai" as const, text: "Happy birthday to the guest of honor! Absolutely — we'll bring out our house-made tiramisu with a candle, and Chef Marco can prepare a special prix fixe menu for the table if you'd like. It's sixty-five per person and includes four courses with wine pairings. Our guests love it for celebrations. Want me to set that up?", delay: 6500 },
    ],
  },
  {
    id: "realestate",
    industry: "Real Estate",
    label: "Listing Inquiry",
    icon: Building2,
    greeting: "Thanks for calling Pinnacle Realty Group. This is Sarah, how can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Thanks for calling Pinnacle Realty Group. This is Sarah, how can I help you today?", delay: 0 },
      { role: "caller" as const, text: "I saw a listing online for a 3-bedroom on Oak Street. Is it still available?", delay: 3000 },
      { role: "ai" as const, text: "Great taste — that one's getting a lot of interest! Yes, it's still available. It's listed at four twenty-five, 3 bed 2 bath with a renovated kitchen and a backyard. Would you like to schedule a showing?", delay: 5000 },
      { role: "caller" as const, text: "Yeah, what do you have this weekend?", delay: 2500 },
      { role: "ai" as const, text: "I have Saturday at 11 AM or Sunday at 1 PM with our listing agent, David. He knows that property inside and out. Which works better for you?", delay: 4500 },
    ],
  },
  {
    id: "medspa",
    industry: "Med Spa / Salon",
    label: "Appointment Booking",
    icon: Scissors,
    greeting: "Glow Aesthetics, this is Emma. Thanks for calling — how can I help?",
    conversation: [
      { role: "ai" as const, text: "Glow Aesthetics, this is Emma. Thanks for calling — how can I help?", delay: 0 },
      { role: "caller" as const, text: "I'm interested in getting Botox. I've never done it before — what should I know?", delay: 3200 },
      { role: "ai" as const, text: "Great question! Botox is one of our most popular treatments — it's quick, about fifteen minutes, and most clients see results within three to five days. Our nurse injector, Michelle, does a free consultation first so she can customize the treatment for your goals. Would you like to book that?", delay: 6000 },
      { role: "caller" as const, text: "Sure, how much is the consultation?", delay: 2200 },
      { role: "ai" as const, text: "The consultation is completely free, and if you decide to go ahead, we're running a new client special right now — twenty percent off your first treatment. I have availability tomorrow at 3 PM or Friday at 11 AM. Which works?", delay: 5500 },
    ],
  },
  {
    id: "auto",
    industry: "Auto Service",
    label: "Oil Change & Repair",
    icon: Car,
    greeting: "Precision Auto Care, this is Alex. How can I help you today?",
    conversation: [
      { role: "ai" as const, text: "Precision Auto Care, this is Alex. How can I help you today?", delay: 0 },
      { role: "caller" as const, text: "My check engine light came on this morning. Can I bring it in today?", delay: 3000 },
      { role: "ai" as const, text: "Absolutely — we don't want you driving around worried about that. I can get you in for a diagnostic today at 2 PM. The diagnostic is forty-nine ninety-five, and that gets applied to any repair we do. What kind of vehicle do you drive?", delay: 5500 },
      { role: "caller" as const, text: "It's a 2019 Honda Accord.", delay: 2000 },
      { role: "ai" as const, text: "Perfect, our technicians work on Hondas all the time. I've got you down for 2 PM today. We'll run the diagnostic, give you a full report, and you'll know exactly what's going on before we do any work. Can I grab your name and number to confirm?", delay: 6000 },
    ],
  },
] as const;

/* ─── Animated Waveform ─── */
function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full transition-[height]"
          style={{
            height: active ? `${12 + Math.sin(i * 0.8 + Date.now() * 0.005) * 14}px` : "4px",
            background: active
              ? `linear-gradient(to top, rgb(52, 211, 153), rgb(16, 185, 129))`
              : "rgba(255,255,255,0.15)",
            animation: active ? `wave ${0.6 + (i % 5) * 0.15}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Widget ─── */
export function VoicePreviewWidget({ compact = false }: { compact?: boolean }) {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const [audioLoading, setAudioLoading] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scenario = SCENARIOS[selectedScenario];

  const stopPlayback = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Also cancel any browser TTS
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
    setCurrentLine(-1);
  }, []);

  const playConversation = useCallback(async () => {
    if (playing) {
      stopPlayback();
      return;
    }

    setPlaying(true);
    setCurrentLine(0);
    setAudioLoading(true);

    // Map scenario voice names to real Recall voice IDs for maximum human realism
    const voiceIdMap: Record<string, string> = {
      hvac: "us-female-warm-receptionist",       // Sarah — warm, empathetic
      dental: "us-female-casual",                 // Emma — casual, friendly
      legal: "us-male-professional",              // Alex — professional, authoritative
      roofing: "us-female-warm-receptionist",     // Sarah — warm, reassuring
      restaurant: "us-female-casual",             // Emma — casual, friendly
      realestate: "us-female-warm-receptionist",  // Sarah — warm, knowledgeable
      medspa: "us-female-casual",                 // Emma — friendly, informative
      auto: "us-male-professional",               // Alex — confident, technical
    };
    const voiceId = voiceIdMap[scenario.id] || "us-female-warm-receptionist";

    // Try to play the AI greeting via voice API, with browser TTS fallback
    try {
      const res = await fetch(
        `/api/demo/voice-preview?voice_id=${voiceId}&text=${encodeURIComponent(scenario.greeting)}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      }
      // No fallback to browser TTS — better silent than robotic
    } catch {
      // Voice API unavailable — do NOT fall back to robot browser TTS
    }
    setAudioLoading(false);

    // Animate through conversation lines
    let cumulativeDelay = 0;
    scenario.conversation.forEach((line, i) => {
      cumulativeDelay += (i === 0 ? 800 : line.delay);
      const t = setTimeout(() => {
        setCurrentLine(i);
        // Auto-scroll to current line
        if (containerRef.current) {
          const el = containerRef.current.querySelector(`[data-line="${i}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        // Try to play AI lines via voice API with proper human-quality voice
        if (line.role === "ai" && i > 0) {
          fetch(
            `/api/demo/voice-preview?voice_id=${voiceId}&text=${encodeURIComponent(line.text)}`
          )
            .then((r) => (r.ok ? r.blob() : null))
            .then((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = new Audio(url);
                audioRef.current = a;
                a.onended = () => URL.revokeObjectURL(url);
                a.play().catch(() => {});
              }
              // No fallback to browser TTS — silence > robot voice
            })
            .catch(() => {
              // Voice API unavailable — do NOT fall back to robot browser TTS
            });
        }
      }, cumulativeDelay);
      timeoutsRef.current.push(t);
    });

    // End playback after last line
    const endT = setTimeout(() => {
      setPlaying(false);
    }, cumulativeDelay + 4000);
    timeoutsRef.current.push(endT);
  }, [playing, scenario, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // Reset when scenario changes
  useEffect(() => {
    stopPlayback();
  }, [selectedScenario, stopPlayback]);

  if (compact) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-black/40 backdrop-blur-sm p-5 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hear It Live</p>
            <p className="text-xs text-[var(--text-tertiary)]">Click play to hear our AI agent</p>
          </div>
        </div>
        <VoiceWaveform active={playing} />
        <button
          onClick={playConversation}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,border-color,color,transform]"
          style={{
            background: playing ? "rgba(239,68,68,0.2)" : "rgba(52,211,153,0.15)",
            color: playing ? "rgb(248,113,113)" : "rgb(52,211,153)",
            border: `1px solid ${playing ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.3)"}`,
          }}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {playing ? "Stop" : "Play Sample Call"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-b from-white/[0.03] to-black/40 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Phone className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Hear Our AI In Action</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                Live Preview
              </span>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Real conversations. Real AI. Zero robots.
            </p>
          </div>
        </div>

        {/* Industry Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-[background-color,border-color,color] whitespace-nowrap ${
                selectedScenario === i
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-white/70"
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Area */}
      <div ref={containerRef} className="px-6 py-4 min-h-[280px] max-h-[360px] overflow-y-auto space-y-3">
        {!playing && currentLine === -1 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Press play to hear a live {scenario.industry} call
            </p>
            <p className="text-xs text-[var(--text-tertiary)] max-w-xs">
              This is an actual AI voice — not a recording. It sounds this natural on every call, 24/7.
            </p>
          </div>
        ) : (
          scenario.conversation.map((line, i) => {
            if (i > currentLine) return null;
            const isAI = line.role === "ai";
            return (
              <div
                key={i}
                data-line={i}
                className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"} ${
                  i === currentLine ? "animate-fadeIn" : ""
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isAI
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {isAI ? <Mic className="w-3.5 h-3.5" /> : "C"}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isAI
                      ? "bg-emerald-500/10 text-white/90 border border-emerald-500/10"
                      : "bg-white/5 text-white/70 border border-white/5"
                  }`}
                >
                  {line.text}
                  {i === currentLine && playing && isAI && (
                    <span className="inline-block ml-1 w-1.5 h-4 bg-emerald-400 rounded-sm animate-pulse" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-4">
          <button
            onClick={playConversation}
            disabled={audioLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-[background-color,border-color,color,transform]"
            style={{
              background: playing ? "rgba(239,68,68,0.15)" : "rgb(16, 185, 129)",
              color: playing ? "rgb(248,113,113)" : "black",
              border: playing ? "1px solid rgba(239,68,68,0.3)" : "none",
            }}
          >
            {audioLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {audioLoading ? "Loading..." : playing ? "Stop" : "Play Call"}
          </button>
          <VoiceWaveform active={playing} />
        </div>
        {!playing && currentLine === -1 && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
            <Volume2 className="w-3 h-3" />
            Turn your volume up for the best experience
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
