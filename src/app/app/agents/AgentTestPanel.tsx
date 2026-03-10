"use client";

import { useState, useRef, useEffect } from "react";

export interface Message {
  role: "caller" | "agent";
  text: string;
}

export interface AgentTestPanelAgent {
  id: string;
  name: string;
  greeting?: string | null;
}

export interface AgentTestPanelWorkspace {
  business_name?: string | null;
  name?: string | null;
}

const SCENARIOS = [
  { label: "Normal call", prompt: "Hi, I need some information about your services." },
  { label: "Booking request", prompt: "I want to book an appointment for next Thursday." },
  { label: "Pricing question", prompt: "How much do your services cost?" },
  { label: "Angry caller", prompt: "I've been waiting for a callback for three days and nobody has contacted me. This is unacceptable." },
  { label: "Wrong number", prompt: "Is this the pizza place on Main Street?" },
];

export function AgentTestPanel({
  agent,
  workspace,
  onTested,
}: {
  agent: AgentTestPanelAgent;
  workspace?: AgentTestPanelWorkspace | null;
  onTested?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const businessName = workspace?.business_name?.trim() || workspace?.name?.trim() || "us";

  async function startTest(scenarioPrompt?: string) {
    setTestStarted(true);
    setMessages([]);
    const greeting =
      agent.greeting?.trim() ||
      `Thanks for calling ${businessName}! How can I help you today?`;
    setMessages([{ role: "agent", text: greeting }]);

    if (scenarioPrompt) {
      setTimeout(() => sendMessage(scenarioPrompt, [{ role: "agent", text: greeting }]), 800);
    }
  }

  async function sendMessage(text?: string, existingMessages?: Message[]) {
    const messageText = text ?? input;
    if (!messageText.trim()) return;

    const currentMessages = existingMessages ?? messages;
    const newCallerMsg: Message = { role: "caller", text: messageText };
    const updatedMessages = [...currentMessages, newCallerMsg];
    setMessages(updatedMessages);
    if (!text) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          messages: updatedMessages,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMessages([
          ...updatedMessages,
          {
            role: "agent",
            text: err.error ?? "Failed to generate response. Check that ANTHROPIC_API_KEY is configured.",
          },
        ]);
      } else {
        const data = (await res.json()) as { response?: string };
        setMessages([...updatedMessages, { role: "agent", text: data.response ?? "I'm sorry, I couldn't generate a response." }]);
      }
    } catch {
      setMessages([...updatedMessages, { role: "agent", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const testedRef = useRef(false);
  useEffect(() => {
    if (testedRef.current) return;
    if (
      messages.length >= 3 &&
      messages.some((m) => m.role === "caller") &&
      messages.some((m, i) => i > 0 && m.role === "agent")
    ) {
      testedRef.current = true;
      fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tested_at: new Date().toISOString() }),
      }).catch(() => {});
      onTested?.();
    }
  }, [messages, agent.id, onTested]);

  if (!testStarted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Test your agent</h2>
          <p className="text-sm text-white/50 max-w-sm mx-auto">
            Chat with your AI agent to see how it responds. It uses your actual greeting, knowledge, and behavior rules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => startTest()}
          className="w-full py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        >
          Start conversation
        </button>

        <div>
          <p className="text-xs text-white/40 mb-3">Or try a scenario:</p>
          <div className="grid grid-cols-1 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => startTest(s.prompt)}
                className="text-left px-4 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
              >
                <p className="text-sm font-medium text-white">{s.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.prompt}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-white/70">Testing: {agent.name}</h2>
        <button
          type="button"
          onClick={() => {
            setTestStarted(false);
            setMessages([]);
          }}
          className="text-xs text-white/40 hover:text-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded"
        >
          Reset
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 ${
              msg.role === "caller"
                ? "bg-white/[0.04] mr-8"
                : "bg-zinc-800/80 border border-zinc-700/50 ml-8"
            }`}
          >
            <p
              className={`text-xs font-medium mb-0.5 ${
                msg.role === "caller" ? "text-white/35" : "text-zinc-400"
              }`}
            >
              {msg.role === "caller" ? "You (as caller)" : "AI Agent"}
            </p>
            <p className="text-sm text-white/90">{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="rounded-xl p-3 bg-zinc-800/80 border border-zinc-700/50 ml-8">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) sendMessage();
          }}
          placeholder="Type as the caller..."
          disabled={loading}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-zinc-600 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-white text-gray-900 font-semibold rounded-xl text-sm disabled:opacity-30 hover:bg-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}
