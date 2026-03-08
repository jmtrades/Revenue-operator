"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { speakTextViaApi } from "@/lib/voice-preview";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface RecognitionEvent {
  results?: Array<Array<{ transcript?: string }>>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const win = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getSpeechRecognitionConstructor());
}

export function VoiceOrb() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [unsupported, setUnsupported] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const showFallbackNotice = useMemo(
    () => !isSpeechSupported() || unsupported,
    [unsupported]
  );

  useEffect(() => {
    if (!open) return;
    if (!isSpeechSupported()) {
      setUnsupported(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm the Recall Touch agent. I can help with anything a phone agent would — scheduling, questions, follow-up. What can I do for you?",
        },
      ]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, loadingReply]);

  const handleTranscript = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextMessages: ConversationMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setLoadingReply(true);
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "sarah",
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        text?: string;
      } | null;
      const reply =
        typeof data?.text === "string" && data.text.trim()
          ? data.text.trim()
          : "That's exactly how I would handle calls for your business. Want to set me up? It takes about 5 minutes.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      await speakTextViaApi(reply, {
        gender: "female",
        rate: 0.98,
        pitch: 1.05,
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble responding right now. Can I get your number and email so the team can follow up?",
        },
      ]);
    } finally {
      setLoadingReply(false);
    }
  };

  const stopListening = () => {
    setListening(false);
    const rec = recognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.stop();
      recognitionRef.current = null;
    }
  };

  const startListening = () => {
    if (!isSpeechSupported()) {
      setUnsupported(true);
      return;
    }
    if (listening) return;
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setUnsupported(true);
      return;
    }
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event: RecognitionEvent) => {
      stopListening();
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      void handleTranscript(transcript);
    };
    rec.onerror = () => {
      stopListening();
    };
    setListening(true);
    rec.start();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-white text-black flex items-center justify-center border border-zinc-300 hover:bg-zinc-100 transition-transform duration-200 shadow-lg hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] animate-[breathing_3s_ease-in-out_infinite]"
        style={{ width: 56, height: 56 }}
        aria-label={open ? "Close agent" : "Speak to our agent"}
        title="Speak to our agent"
      >
        <Mic className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[320px] max-w-[90vw] rounded-2xl border border-zinc-800 bg-black/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-100 text-black flex items-center justify-center text-sm font-semibold">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">
                  Recall Touch
                </span>
                <span className="text-[11px] text-zinc-500">
                  Speak to agent
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-white text-sm"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div
            ref={panelRef}
            className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto text-sm"
          >
            {messages.map((m, index) => (
              <div
                key={`${m.role}-${index}`}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-snug ${
                    m.role === "user"
                      ? "bg-zinc-800 text-zinc-100 rounded-br-sm"
                      : "bg-zinc-900 text-zinc-100 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loadingReply && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 text-zinc-100 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}
            {showFallbackNotice && (
              <p className="text-[11px] text-zinc-500 mt-1">
                This uses your microphone. If it&apos;s blocked, try
                enabling it in your browser, or use the text chat above.
              </p>
            )}
          </div>
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                listening
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-white text-black hover:bg-zinc-100"
              }`}
            >
              <span aria-hidden>{listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}</span>
              <span>{listening ? "Stop" : "Talk"}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setMessages((prev) =>
                  prev.length > 0 ? prev.slice(0, 1) : prev
                )
              }
              className="text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}

