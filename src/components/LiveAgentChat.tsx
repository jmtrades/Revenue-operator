"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Waveform } from "@/components/Waveform";
import { speakText } from "@/lib/voice-preview";

type AgentId = "sarah" | "alex" | "emma";

type Msg = { role: "user" | "assistant"; content: string };

const AGENTS: Record<
  AgentId,
  {
    id: AgentId;
    name: string;
    initials: string;
    pill: string;
    avatarBg: string;
    greeting: string;
    tts: { gender: "female" | "male"; rate: number; pitch: number };
    elevenVoiceId?: string;
  }
> = {
  sarah: {
    id: "sarah",
    name: "Sarah",
    initials: "S",
    pill: "Sarah",
    avatarBg: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    greeting: "Hi there! Thanks for calling Riverside Plumbing. This is Sarah — how can I help you today?",
    tts: { gender: "female", rate: 0.95, pitch: 1.05 },
    elevenVoiceId: process.env.NEXT_PUBLIC_ELEVENLABS_SARAH_VOICE_ID,
  },
  alex: {
    id: "alex",
    name: "Alex",
    initials: "A",
    pill: "Alex",
    avatarBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    greeting: "Good afternoon, Riverside Plumbing. This is Alex. How may I assist you?",
    tts: { gender: "male", rate: 0.9, pitch: 0.85 },
    elevenVoiceId: process.env.NEXT_PUBLIC_ELEVENLABS_ALEX_VOICE_ID,
  },
  emma: {
    id: "emma",
    name: "Emma",
    initials: "E",
    pill: "Emma",
    avatarBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    greeting: "Hey! Thanks for calling Riverside Plumbing! This is Emma. What can I do for you?",
    tts: { gender: "female", rate: 1.05, pitch: 1.1 },
    elevenVoiceId: process.env.NEXT_PUBLIC_ELEVENLABS_EMMA_VOICE_ID,
  },
};

function canUseSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

async function speakViaElevenLabs(text: string, voiceId: string): Promise<void> {
  const r = await fetch("/api/agent/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId }),
  });
  if (!r.ok) throw new Error("speak failed");
  const buf = await r.arrayBuffer();
  const blob = new Blob([buf], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("audio play failed"));
    };
    audio.play().catch(reject);
  });
}

export function LiveAgentChat(props: {
  variant?: "homepage" | "demo" | "mini";
  initialAgent?: AgentId;
  businessName?: string;
  greeting?: string;
  personality?: number;
  callStyle?: "thorough" | "conversational" | "quick";
  voiceDefaultOn?: boolean;
  showVoiceToggle?: boolean;
  showMic?: boolean;
}) {
  const {
    variant = "homepage",
    initialAgent = "sarah",
    businessName,
    greeting,
    personality,
    callStyle,
    voiceDefaultOn = false,
    showVoiceToggle = variant !== "mini",
    showMic = variant !== "mini",
  } = props;

  const [agent, setAgent] = useState<AgentId>(initialAgent);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(voiceDefaultOn);
  const listRef = useRef<HTMLDivElement | null>(null);

  const cfg = AGENTS[agent];
  const heightClass = variant === "demo" ? "h-[500px]" : variant === "mini" ? "h-[250px]" : "h-[360px]";

  const statusDot = "bg-green-500";

  const requestPayload = useMemo(
    () => ({
      agent,
      businessName,
      greeting,
      personality,
      callStyle,
    }),
    [agent, businessName, greeting, personality, callStyle]
  );

  useEffect(() => {
    // On first load and on agent switch: reset and greet.
    setMessages([{ role: "assistant", content: cfg.greeting }]);
    setInput("");
    setLoading(false);
    setSpeaking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  useEffect(() => {
    // Auto-scroll to bottom.
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user", content: trimmed } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...requestPayload,
          messages: next,
        }),
      });
      const data = (await r.json().catch(() => null)) as { text?: string };
      const reply = typeof data?.text === "string" && data.text.trim() ? data.text.trim() : "Sorry — could you say that again?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (voiceOn) {
        setSpeaking(true);
        const voiceId = cfg.elevenVoiceId;
        try {
          if (voiceId) {
            await speakViaElevenLabs(reply, voiceId);
          } else {
            await new Promise<void>((resolve) => {
              speakText(reply, {
                gender: cfg.tts.gender,
                rate: cfg.tts.rate,
                pitch: cfg.tts.pitch,
                onEnd: resolve,
              });
            });
          }
        } catch {
          // Fallback to browser voice if ElevenLabs fails.
          await new Promise<void>((resolve) => {
            speakText(reply, {
              gender: cfg.tts.gender,
              rate: cfg.tts.rate,
              pitch: cfg.tts.pitch,
              onEnd: resolve,
            });
          });
        } finally {
          setSpeaking(false);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — I didn’t catch that. Could you say it one more time?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startMic = () => {
    if (!canUseSpeechRecognition()) return;
    type RecInstance = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: { results?: Array<Array<{ transcript?: string }>> }) => void) | null;
      onerror: (() => void) | null;
      start(): void;
    };
    const Win = window as unknown as { SpeechRecognition?: new () => RecInstance; webkitSpeechRecognition?: new () => RecInstance };
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: { results?: Array<Array<{ transcript?: string }>> }) => {
      const transcript = e?.results?.[0]?.[0]?.transcript;
      if (typeof transcript === "string" && transcript.trim()) send(transcript.trim());
    };
    rec.onerror = () => {};
    rec.start();
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-semibold ${cfg.avatarBg}`}>
            {cfg.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{cfg.name}</p>
              <span className={`inline-block w-2 h-2 rounded-full ${statusDot}`} aria-label="Online" />
              <span className="text-[11px] text-zinc-500">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5">
            {(["sarah", "alex", "emma"] as AgentId[]).map((id) => {
              const a = AGENTS[id];
              const active = agent === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAgent(id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                    active ? "bg-white/10 border-white text-white" : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                  aria-label={`Switch agent to ${a.name}`}
                >
                  {a.pill}
                </button>
              );
            })}
          </div>

          {showVoiceToggle && (
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              className="px-3 py-1.5 rounded-xl border border-zinc-700 text-[11px] text-zinc-300 hover:border-zinc-500"
              aria-label={voiceOn ? "Voice on" : "Voice off"}
            >
              {voiceOn ? "🔊 Voice on" : "🔇 Voice off"}
            </button>
          )}
        </div>
      </div>

      <div ref={listRef} className={`px-4 py-4 overflow-y-auto ${heightClass}`}>
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3 py-2 text-sm leading-snug ${
                  m.role === "user"
                    ? "bg-zinc-700/50 text-white rounded-2xl rounded-tr-md"
                    : "bg-zinc-800/80 text-zinc-100 rounded-2xl rounded-tl-md"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800/80 text-zinc-100 rounded-2xl rounded-tl-md px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:240ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/30">
        <div className="flex items-center gap-2">
          {showMic && canUseSpeechRecognition() && (
            <button
              type="button"
              onClick={startMic}
              className="w-10 h-10 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-500 flex items-center justify-center"
              aria-label="Voice input"
            >
              🎙
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send(input);
              }
            }}
            className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none"
            placeholder="Type your message…"
            aria-label="Message input"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="bg-white text-black font-semibold rounded-xl px-4 py-3 hover:bg-zinc-200 disabled:opacity-60"
            aria-label="Send message"
          >
            Send
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500">
            {variant === "mini" ? "Test how your agent responds before you connect your number." : "Try asking about services, pricing, or availability."}
          </p>
          {speaking && (
            <div className="flex items-center gap-2 text-[11px] text-green-400">
              <Waveform isPlaying />
              Speaking…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

