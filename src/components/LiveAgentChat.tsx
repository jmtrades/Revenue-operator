"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic } from "lucide-react";

type AgentId = "sarah" | "alex" | "emma";

type Msg = { role: "user" | "assistant"; content: string };

function getAgents(t: (k: string) => string): Record<AgentId, { id: AgentId; name: string; initials: string; pill: string; avatarBg: string; greeting: string }> {
  return {
    sarah: {
      id: "sarah",
      name: t("liveChat.agents.professional.name"),
      initials: "P",
      pill: t("liveChat.agents.professional.name"),
      avatarBg: "bg-[var(--bg-inset)]/30 text-[var(--text-secondary)] border-[var(--border-default)]/30",
      greeting: t("liveChat.agents.professional.greeting"),
    },
    alex: {
      id: "alex",
      name: t("liveChat.agents.friendly.name"),
      initials: "F",
      pill: t("liveChat.agents.friendly.name"),
      avatarBg: "bg-[var(--bg-inset)]/30 text-[var(--text-secondary)] border-[var(--border-default)]/30",
      greeting: t("liveChat.agents.friendly.greeting"),
    },
    emma: {
      id: "emma",
      name: t("liveChat.agents.concise.name"),
      initials: "C",
      pill: t("liveChat.agents.concise.name"),
      avatarBg: "bg-[var(--bg-inset)]/30 text-[var(--text-secondary)] border-[var(--border-default)]/30",
      greeting: t("liveChat.agents.concise.greeting"),
    },
  };
}

function canUseSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

export type LiveAgentChatRef = { send: (text: string) => void };

export const LiveAgentChat = forwardRef<LiveAgentChatRef, {
  variant?: "homepage" | "demo" | "mini";
  initialAgent?: AgentId;
  businessName?: string;
  greeting?: string;
  personality?: number;
  callStyle?: "thorough" | "conversational" | "quick";
  showMic?: boolean;
  onUserMessage?: () => void;
}>(function LiveAgentChat(props, ref) {
  const {
    variant = "homepage",
    initialAgent = "sarah",
    businessName,
    greeting,
    personality,
    callStyle,
    showMic = variant !== "mini",
    onUserMessage,
  } = props;

  const t = useTranslations("messages");
  const agents = useMemo(() => getAgents(t), [t]);
  const [agent, setAgent] = useState<AgentId>(initialAgent);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Defer speech recognition check to client to avoid hydration mismatch
  useEffect(() => { setHasSpeech(canUseSpeechRecognition()); }, []);

  const cfg = agents[agent];
  const heightClass = variant === "demo" ? "h-[500px]" : variant === "mini" ? "h-[220px]" : "h-[380px]";
  const agentPills: Record<AgentId, string> = useMemo(
    () => ({
      sarah: t("liveChat.voiceProfessional"),
      alex: t("liveChat.voiceFriendly"),
      emma: t("liveChat.voiceConcise"),
    }),
    [t]
  );
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showChips = userMessageCount === 0;
  const MAX_EXCHANGES = 20;
  const atLimit = messages.length >= MAX_EXCHANGES;

  const _statusDot = "bg-green-500";

  const _requestPayload = useMemo(
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
    setMessages([{ role: "assistant", content: greeting ?? cfg.greeting }]);
    setInput("");
    setLoading(false);

  }, [agent, greeting, cfg.greeting]);

  useEffect(() => {
    // Auto-scroll to bottom.
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || atLimit) return;
    onUserMessage?.();
    const next = [...messages, { role: "user", content: trimmed } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const businessPayload = businessName
        ? { name: businessName, services: "", hours: "", area: "", pricing: "Free estimates" }
        : undefined;
      const r = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          agentId: agent,
          business: businessPayload,
        }),
      });
      const data = (await r.json().catch(() => null)) as { text?: string };
      const reply = typeof data?.text === "string" && data.text.trim() ? data.text.trim() : t("liveChat.misheard");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("liveChat.misheardCatch") },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, atLimit, messages, onUserMessage, agent, businessName, t]);

  useImperativeHandle(ref, () => ({ send }), [send]);

  const startMic = () => {
    if (!hasSpeech) return;
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

  const suggestions = [t("liveChat.suggestionAppointment"), t("liveChat.suggestionPricing"), t("liveChat.suggestionServices")];

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-base)]/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-[var(--text-tertiary)] shrink-0">Revenue Operator</span>
          <span className="text-[var(--text-tertiary)]">·</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {(["sarah", "alex", "emma"] as AgentId[]).map((id) => {
              const active = agent === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAgent(id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                    active ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--text-primary)]" : "bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                  }`}
                  aria-label={t("liveChat.switchAgentTo", { name: agentPills[id] })}
                >
                  {agentPills[id]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div ref={listRef} className={`px-4 py-4 overflow-y-auto ${heightClass}`}>
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3 py-2 text-sm leading-snug ${
                  m.role === "user"
                    ? "bg-[var(--bg-inset)]/50 text-white rounded-2xl rounded-tr-md"
                    : "bg-[var(--bg-inset)]/80 text-[var(--text-primary)] rounded-2xl rounded-tl-md"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--bg-inset)]/80 text-[var(--text-primary)] rounded-2xl rounded-tl-md px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-bounce [animation-delay:240ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-base)]/30">
        {showChips && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-full px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {showMic && hasSpeech && (
            <button
              type="button"
              onClick={startMic}
              className="w-10 h-10 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-default)] flex items-center justify-center"
              aria-label={t("liveChat.voiceInputLabel")}
            >
              <Mic className="h-4 w-4" />
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
            className="flex-1 w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-default)] focus:ring-1 focus:ring-[var(--border-default)] outline-none"
            placeholder={t("inputPlaceholder")}
            aria-label={t("liveChat.messageInputLabel")}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || loading || atLimit}
            className="bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium rounded-xl px-5 py-2.5 hover:opacity-90 disabled:opacity-60 transition-colors"
            aria-label={t("liveChat.sendMessageLabel")}
          >
            →
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {variant === "mini" ? t("liveChat.testHint") : t("liveChat.tryAsking")}
          </p>
          {atLimit && <p className="text-[11px] text-amber-400">{t("liveChat.sessionLimit")}</p>}
        </div>
      </div>
    </div>
  );
});

