"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, PhoneCall, MessageSquare, Mail, ChevronLeft } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import type { InboxThread, InboxMessage, InboxChannel } from "@/lib/mock/inbox";

const PAGE_TITLE = "Inbox — Recall Touch";

type Filter = "all" | "unread" | "phone" | "sms" | "email" | "whatsapp";
type ReplyChannel = "sms" | "email" | "whatsapp";

const INBOX_SNAPSHOT_PREFIX = "rt_inbox_snapshot:";

function readInboxSnapshot(workspaceId: string): InboxThread[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = window.localStorage.getItem(`${INBOX_SNAPSHOT_PREFIX}${workspaceId}`);
    const parsed = raw ? (JSON.parse(raw) as InboxThread[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistInboxSnapshot(workspaceId: string, threads: InboxThread[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(
      `${INBOX_SNAPSHOT_PREFIX}${workspaceId}`,
      JSON.stringify(threads),
    );
  } catch {
    // ignore persistence errors
  }
}

function formatRelative(timestamp: string): string {
  const d = new Date(timestamp).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  if (hour < 24) return `${hour}h ago`;
  if (day === 1) return "Yesterday";
  return `${day}d ago`;
}

function channelIcon(channel: InboxChannel) {
  if (channel === "phone") return PhoneCall;
  if (channel === "sms") return MessageSquare;
  if (channel === "whatsapp") return MessageSquare; // reuse or add WhatsApp icon
  return Mail;
}

function channelLabel(channel: InboxChannel) {
  if (channel === "phone") return "Phone";
  if (channel === "sms") return "SMS";
  if (channel === "whatsapp") return "WhatsApp";
  return "Email";
}

function ConversationList({
  threads,
  selectedId,
  filter,
  search,
  onSelect,
  onFilterChange,
  onSearchChange,
}: {
  threads: InboxThread[];
  selectedId: string | null;
  filter: Filter;
  search: string;
  onSelect: (id: string) => void;
  onFilterChange: (f: Filter) => void;
  onSearchChange: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    let list = threads;
    if (filter === "unread") list = list.filter((t) => t.unread);
    if (filter === "phone") list = list.filter((t) => t.channel === "phone");
    if (filter === "sms") list = list.filter((t) => t.channel === "sms");
    if (filter === "email") list = list.filter((t) => t.channel === "email");
    if (filter === "whatsapp") list = list.filter((t) => t.channel === "whatsapp");
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.contactName.toLowerCase().includes(q) ||
          t.contactPhone.toLowerCase().includes(q) ||
          t.lastMessage.toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }, [threads, filter, search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border-default)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)]"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {(["all", "unread", "phone", "sms", "email", "whatsapp"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1.5 rounded-full font-medium border ${
                filter === f
                  ? "bg-white text-black border-white"
                  : "bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-medium)] hover:border-[var(--border-medium)]"
              }`}
            >
              {f === "all"
                ? "All"
                : f === "unread"
                  ? "Unread"
                  : f === "phone"
                    ? "Phone"
                    : f === "sms"
                      ? "SMS"
                      : f === "whatsapp"
                        ? "WhatsApp"
                        : "Email"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
            <p className="text-sm font-medium text-white mb-1">Your conversations will appear here</p>
            <p className="text-xs text-zinc-500 mb-4">Your AI can send follow-up texts after calls. Enable SMS in settings to get started.</p>
            <Link href="/app/settings/integrations" className="text-sm font-medium text-white underline underline-offset-2 hover:no-underline">Enable SMS →</Link>
          </div>
        ) : filtered.map((thread) => {
          const Icon = channelIcon(thread.channel);
          const isActive = thread.id === selectedId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={`w-full flex items-start gap-3 px-3 py-3 border-b border-[var(--border-default)] text-left hover:bg-[var(--bg-hover)] ${
                isActive ? "bg-[var(--bg-card)] border-l-2 border-l-sky-500" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
                {thread.contactName
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium text-white truncate">
                      {thread.contactName}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    {formatRelative(thread.lastMessageAt)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{thread.lastMessage}</p>
              </div>
              {thread.unread && (
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-1" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CallCard({ message }: { message: InboxMessage }) {
  const duration =
    message.durationSeconds != null
      ? `${Math.floor(message.durationSeconds / 60)}:${String(
          message.durationSeconds % 60,
        ).padStart(2, "0")} min`
      : null;
  return (
    <div className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-zinc-300 mb-2 max-w-md">
      <div className="flex items-center gap-2 mb-1">
        <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
        <span className="font-medium">Phone call</span>
      </div>
      {message.outcome && (
        <p className="text-[11px] text-zinc-300 mb-1">Outcome: {message.outcome}</p>
      )}
      {duration && <p className="text-[11px] text-zinc-400 mb-1">Duration: {duration}</p>}
      {message.callId && (
        <a
          href={`/app/calls/${encodeURIComponent(message.callId)}`}
          className="text-[11px] text-sky-400 hover:text-sky-300 underline"
        >
          View call →
        </a>
      )}
      <p className="text-[10px] text-zinc-500 mt-1">{formatRelative(message.timestamp)}</p>
    </div>
  );
}

function ConversationDetail({
  thread,
  replyChannel,
  setReplyChannel,
  input,
  setInput,
  onSend,
  sending,
  onToggleStatus,
  isMobile,
  onBack,
}: {
  thread: InboxThread | null;
  replyChannel: ReplyChannel;
  setReplyChannel: (ch: ReplyChannel) => void;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  onToggleStatus: () => void;
  isMobile?: boolean;
  onBack?: () => void;
}) {
  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
        Select a conversation to view details.
      </div>
    );
  }

  const isOpen = thread.status === "Open" || thread.status === "Pending";
  const channel = thread.channel;

  return (
    <div className="flex flex-col h-full border-l border-[var(--border-default)] md:border-l-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-card)]/80">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 mr-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{thread.contactName}</p>
            <p className="text-xs text-zinc-500 truncate">{thread.contactPhone}</p>
          </div>
          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
            {channel === "phone" && <PhoneCall className="w-3 h-3" />}
            {channel === "sms" && <MessageSquare className="w-3 h-3" />}
            {channel === "whatsapp" && <MessageSquare className="w-3 h-3" />}
            {channel === "email" && <Mail className="w-3 h-3" />}
            {channelLabel(thread.channel)}
          </span>
          <span
            className={`ml-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
              thread.status === "Open"
                ? "bg-emerald-500/20 text-emerald-300"
                : thread.status === "Pending"
                  ? "bg-amber-500/20 text-amber-200"
                  : "bg-[var(--bg-card)] text-zinc-300"
            }`}
          >
            {thread.status}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleStatus}
          className="text-xs font-medium px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-zinc-200 hover:bg-zinc-800 shrink-0"
        >
          {isOpen ? "Mark resolved" : "Reopen"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {thread.messages.map((m) => {
          if (m.isCall) {
            return <CallCard key={m.id} message={m} />;
          }
          const isAgent = m.sender === "agent";
          return (
            <div
              key={m.id}
              className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isAgent
                    ? "bg-sky-500 text-black rounded-br-sm"
                    : "bg-[var(--bg-input)] text-[var(--text-primary)] rounded-bl-sm border border-[var(--border-default)]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    isAgent ? "text-black/70" : "text-zinc-500"
                  }`}
                >
                  {formatRelative(m.timestamp)}
                  {m.channel !== thread.channel && (
                    <span className="ml-1 uppercase">
                      · {channelLabel(m.channel)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--border-default)] px-3 py-3 bg-[var(--bg-card)]/80">
        <div className="flex items-center gap-2 mb-2 text-[11px] text-zinc-400">
          <span>Reply as</span>
          {(["sms", "email", "whatsapp"] as ReplyChannel[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setReplyChannel(ch)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium ${
                replyChannel === ch
                  ? "bg-white text-black border-white"
                  : "bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-medium)] hover:border-[var(--border-medium)]"
              }`}
            >
              {ch === "sms" ? "SMS" : ch === "whatsapp" ? "WhatsApp" : "Email"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)]"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId =
    workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialThreads = readInboxSnapshot(snapshotWorkspaceId);
  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);
  const [threads, setThreads] = useState<InboxThread[]>(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialThreads[0]?.id ?? null,
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [replyChannel, setReplyChannel] = useState<ReplyChannel>("sms");
  const [input, setInput] = useState("");
  const [mobileMode, setMobileMode] = useState<"list" | "detail">("list");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/inbox?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { threads: [] }))
      .then((data: { threads?: InboxThread[] }) => {
        const list = data.threads ?? [];
        if (list.length > 0) {
          setThreads(list);
          setSelectedId((current) =>
            current && list.some((thread) => thread.id === current)
              ? current
              : (list[0]?.id ?? null),
          );
          persistInboxSnapshot(workspaceId, list);
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || threads.length === 0) return;
    persistInboxSnapshot(workspaceId, threads);
  }, [workspaceId, threads]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? threads[0] ?? null,
    [threads, selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileMode("detail");
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)));
  };

  const handleSend = async () => {
    if (!activeThread || !input.trim()) return;
    const content = input.trim();
    const nowIso = new Date().toISOString();
    const channel: InboxChannel = replyChannel === "sms" ? "sms" : replyChannel === "whatsapp" ? "whatsapp" : "email";
    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: activeThread.id,
          content,
          channel,
        }),
      });
      if (!res.ok) throw new Error("send_failed");
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? {
                ...t,
                messages: [
                  ...t.messages,
                  {
                    id: `local-${Date.now()}`,
                    sender: "agent",
                    content,
                    timestamp: nowIso,
                    channel,
                  },
                ],
                lastMessage: content,
                lastMessageAt: nowIso,
                status: t.status === "Resolved" ? "Open" : t.status,
                unread: false,
              }
            : t,
        ),
      );
      setInput("");
    } finally {
      setSending(false);
    }
  };

  const handleToggleStatus = () => {
    if (!activeThread) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              status: t.status === "Resolved" ? "Open" : "Resolved",
              unread: false,
            }
          : t,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8 h-full">
        <h1 className="text-xl md:text-2xl font-semibold text-white mb-4">Inbox</h1>
        <p className="text-sm text-zinc-400 mb-4">All conversations in one place.</p>
        {/* Mobile layout */}
        <div className="md:hidden h-[calc(100vh-7rem)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
          {mobileMode === "list" ? (
            <ConversationList
              threads={threads}
              selectedId={activeThread?.id ?? null}
              filter={filter}
              search={search}
              onSelect={handleSelect}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
            />
          ) : (
            <ConversationDetail
              thread={activeThread}
              replyChannel={replyChannel}
              setReplyChannel={setReplyChannel}
              input={input}
              setInput={setInput}
              onSend={() => { void handleSend(); }}
              sending={sending}
              onToggleStatus={handleToggleStatus}
              isMobile
              onBack={() => setMobileMode("list")}
            />
          )}
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex h-[calc(100vh-8rem)] rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]/60">
          <div className="w-80 border-r border-[var(--border-default)] bg-[var(--bg-card)]/80">
            <ConversationList
              threads={threads}
              selectedId={activeThread?.id ?? null}
              filter={filter}
              search={search}
              onSelect={handleSelect}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <ConversationDetail
              thread={activeThread}
              replyChannel={replyChannel}
              setReplyChannel={setReplyChannel}
              input={input}
              setInput={setInput}
              onSend={() => { void handleSend(); }}
              sending={sending}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

