"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslations } from "next-intl";

type ApiThread = {
  lead_id: string;
  conversation_id?: string;
  name: string;
  phone: string;
  preview: string;
  time: string;
};

type Thread = {
  id: string;
  lead_id: string | null;
  name: string;
  phone?: string;
  preview: string;
  time: string;
  unread: boolean;
  messages: Array<{ id: string; from: "ai" | "user"; text: string; time: string }>;
};

function formatToLabel(phoneOrName: string, newContactLabel: string): string {
  const s = phoneOrName.trim();
  if (/^\+?[\d\s\-()]{10,}$/.test(s)) return s;
  return s || newContactLabel;
}

function formatMsgTime(iso: string, yesterdayLabel: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (now.toDateString() === d.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (now.getTime() - d.getTime() < 86400 * 1000) return yesterdayLabel;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function AppMessagesPage() {
  const t = useTranslations("messages");
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to")?.trim() ?? "";
  const leadIdParam = searchParams.get("lead_id")?.trim() ?? "";

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const active = threads.find((t) => t.id === selected) ?? threads[0] ?? null;

  const fetchThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await fetch("/api/messages/threads", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setThreads([]);
        return;
      }
      const data = await res.json();
      const list: Thread[] = (data.threads ?? []).map((t: ApiThread) => ({
        id: t.lead_id,
        lead_id: t.lead_id,
        name: t.name,
        phone: t.phone,
        preview: t.preview,
        time: t.time,
        unread: false,
        messages: [],
      }));
      setThreads(list);
      if (list.length > 0 && !selected) {
        if (leadIdParam && list.some((t) => t.id === leadIdParam)) {
          setSelected(leadIdParam);
        } else if (toParam) {
          const byPhone = list.find((t) => t.phone === toParam || t.name === toParam || t.id === toParam);
          if (byPhone) setSelected(byPhone.id);
          else setSelected(list[0].id);
        } else {
          setSelected(list[0].id);
        }
      }
    } finally {
      setLoadingThreads(false);
    }
  }, [leadIdParam, toParam, selected]);

  useEffect(() => {
    fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fetch threads once on mount; URL params read inside fetchThreads
  }, []);

  useEffect(() => {
    if (!toParam || loadingThreads) return;
    const alreadyHasMatch = threads.some((t) => t.phone === toParam || t.name === toParam || t.id === toParam || t.id === `phone-${encodeURIComponent(toParam)}`);
    if (alreadyHasMatch) return;
    const resolveByPhone = async () => {
      try {
        const res = await fetch(`/api/leads/by-phone?phone=${encodeURIComponent(toParam)}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const leadId = data.lead_id;
          setThreads((prev) => {
            if (prev.some((t) => t.id === leadId)) return prev;
            return [
              { id: leadId, lead_id: leadId, name: data.name || formatToLabel(toParam, t("newContact")), preview: t("noMessagesYet"), time: t("now"), unread: false, messages: [] },
              ...prev,
            ];
          });
          setSelected(leadId);
        } else {
          const id = `phone-${encodeURIComponent(toParam)}`;
          setThreads((prev) => {
            if (prev.some((t) => t.id === id)) return prev;
            return [{ id, lead_id: null, name: formatToLabel(toParam, t("newContact")), preview: t("addContactInLeadsToMessage"), time: t("now"), unread: false, messages: [] }, ...prev];
          });
          setSelected(id);
        }
      } catch {
        const id = `phone-${encodeURIComponent(toParam)}`;
        setThreads((prev) => {
          if (prev.some((t) => t.id === id)) return prev;
          return [{ id, lead_id: null, name: formatToLabel(toParam, t("newContact")), preview: t("addContactInLeadsToMessage"), time: t("now"), unread: false, messages: [] }, ...prev];
        });
        setSelected(id);
      }
    };
    resolveByPhone();
  }, [toParam, loadingThreads, threads, t]);

  useEffect(() => {
    if (leadIdParam && threads.some((t) => t.id === leadIdParam) && !selected) setSelected(leadIdParam);
  }, [leadIdParam, threads, selected]);

  const fetchMessages = useCallback(async (threadId: string, leadId: string) => {
    if (!leadId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${leadId}/messages`, { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, messages: [] } : t)));
        return;
      }
      const data = await res.json();
      const list = (data.messages ?? []).map((m: { id: string; role: string; content: string; created_at: string }) => ({
        id: m.id,
        from: m.role === "user" ? ("user" as const) : ("ai" as const),
        text: m.content,
        time: formatMsgTime(m.created_at, t("yesterday")),
      }));
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, messages: list, preview: list.length ? list[list.length - 1].text.slice(0, 60) : t.preview } : t
        )
      );
    } finally {
      setLoadingMessages(false);
    }
  }, [t]);

  useEffect(() => {
    if (active?.lead_id && active.messages.length === 0) fetchMessages(active.id, active.lead_id);
  }, [active?.id, active?.lead_id, active?.messages.length, fetchMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !active) return;
    if (!active.lead_id) {
      setToast(t("toast.addContactFirst"));
      return;
    }
    setSending(true);
    setInput("");
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lead_id: active.lead_id, content: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast((err as { error?: string }).error || t("failedToSend"));
        return;
      }
      setToast(t("toast.sent"));
      await fetchMessages(active.id, active.lead_id);
      setThreads((prev) =>
        prev.map((th) => (th.id === active.id ? { ...th, preview: text.slice(0, 60), time: t("now") } : th))
      );
    } finally {
      setSending(false);
    }
  }, [active, input, fetchMessages, t]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const canSend = active?.lead_id && input.trim() && !sending;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-lg md:text-xl font-semibold text-white">Messages</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-4 min-h-[420px]">
        <div className="md:w-72 shrink-0 border border-[var(--border-default)] rounded-2xl bg-[var(--bg-card)] overflow-hidden">
          {loadingThreads ? (
            <div className="p-4 text-center text-xs text-zinc-500">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Bot}
                title={t("empty.title")}
                description={t("empty.body")}
                primaryAction={{
                  label: t("empty.action"),
                  href: "/app/activity",
                }}
                className="px-4 py-6"
              />
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={`w-full text-left px-3 py-3 border-b border-[var(--border-default)] flex gap-2 items-start ${
                  (active?.id ?? selected) === t.id ? "bg-[var(--bg-input)]" : "hover:bg-[var(--bg-card)]"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[11px] font-medium text-white shrink-0">
                  {t.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-zinc-500 shrink-0">{t.time}</p>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{t.preview}</p>
                </div>
                {t.unread && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 mt-2 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
        <div className="flex-1 border border-[var(--border-default)] rounded-2xl bg-[var(--bg-input)]/40 flex flex-col">
          {active ? (
            <>
              <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{active.name}</p>
                  <p className="text-[11px] text-zinc-500">SMS · Two-way</p>
                </div>
                {!active.lead_id && (
                  <span className="text-[10px] text-amber-500">Add in Leads to send</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {loadingMessages ? (
                  <div className="text-xs text-zinc-500">Loading messages…</div>
                ) : (
                  active.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                          m.from === "user"
                            ? "bg-zinc-200 text-zinc-900 rounded-br-sm"
                            : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                            {m.from === "user" ? active.name : <><Bot className="h-3 w-3" /> Agent</>}
                          </span>
                          <span className="text-[10px] text-zinc-500">{m.time}</span>
                        </div>
                        <p>{m.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-[var(--border-default)] flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={active.lead_id ? t("inputPlaceholder") : t("inputPlaceholderNoContact")}
                  disabled={!active.lead_id}
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void handleSend()}
                  className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
              {t("selectConversation")}
            </div>
          )}
        </div>
      </div>
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm text-zinc-100 shadow-lg">
          {toast}
        </div>
      )}
      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Activity
        </Link>
      </p>
    </div>
  );
}
