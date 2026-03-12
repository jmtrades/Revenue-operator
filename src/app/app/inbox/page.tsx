"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Search, PhoneCall, MessageSquare, Mail, ChevronLeft, PanelRightClose, PanelRightOpen, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";

type InboxChannel = "phone" | "sms" | "email" | "whatsapp";
type InboxStatus = "Open" | "Resolved" | "Pending";

interface InboxMessage {
  id: string;
  sender: "agent" | "contact" | "system";
  content: string;
  timestamp: string;
  channel: InboxChannel;
  isCall?: boolean;
  callId?: string;
  durationSeconds?: number;
  outcome?: string;
  recording_url?: string | null;
}

interface InboxThread {
  id: string;
  contactName: string;
  contactPhone: string;
  channel: InboxChannel;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  status: InboxStatus;
  messages: InboxMessage[];
}
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AudioPlayer } from "@/components/ui/AudioPlayer";

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

function formatRelative(
  timestamp: string,
  t: (key: string, params?: Record<string, string | number | Date>) => string
): string {
  const d = new Date(timestamp).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (min < 1) return t("inbox.relative.justNow");
  if (min < 60) return t("inbox.relative.minutesAgo", { count: min });
  if (hour < 24) return t("inbox.relative.hoursAgo", { count: hour });
  if (day === 1) return t("inbox.relative.yesterday");
  return t("inbox.relative.daysAgo", { count: day });
}

function channelIcon(channel: InboxChannel) {
  if (channel === "phone") return PhoneCall;
  if (channel === "sms") return MessageSquare;
  if (channel === "whatsapp") return MessageSquare; // reuse or add WhatsApp icon
  return Mail;
}

function channelLabel(
  channel: InboxChannel,
  t: (key: string) => string,
) {
  if (channel === "phone") return t("inbox.channel.phone");
  if (channel === "sms") return t("inbox.channel.sms");
  if (channel === "whatsapp") return t("inbox.channel.whatsapp");
  return t("inbox.channel.email");
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
  const t = useTranslations();
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

  const filterTabs = [
    { id: "all" as const, label: t("inbox.filters.all") },
    { id: "unread" as const, label: t("inbox.filters.unread") },
    { id: "phone" as const, label: t("inbox.filters.phone") },
    { id: "sms" as const, label: t("inbox.filters.sms") },
    { id: "email" as const, label: t("inbox.filters.email") },
    { id: "whatsapp" as const, label: t("inbox.filters.whatsapp") },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border-default)]">
        <Input
          type="search"
          icon={Search}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("inbox.search.placeholder")}
          className="rounded-xl mb-3"
        />
        <Tabs
          tabs={filterTabs}
          activeTab={filter}
          onChange={(id) => onFilterChange(id as Filter)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
            <p className="text-sm font-medium text-white mb-1">
              {t("inbox.empty.title")}
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              {t("inbox.empty.body")}
            </p>
            <Link
              href="/app/settings/integrations"
              className="text-sm font-medium text-white underline underline-offset-2 hover:no-underline"
            >
              {t("inbox.empty.cta")}
            </Link>
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
                isActive ? "bg-[var(--bg-card)] border-l-2 border-l-[var(--accent-primary)]" : ""
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
                    {formatRelative(thread.lastMessageAt, t)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{thread.lastMessage}</p>
              </div>
              {thread.unread && (
                <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shrink-0 mt-1" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CallCard({ message }: { message: InboxMessage }) {
  const t = useTranslations();
  const duration =
    message.durationSeconds != null
      ? `${Math.floor(message.durationSeconds / 60)}:${String(
          message.durationSeconds % 60,
        ).padStart(2, "0")} min`
      : null;
  return (
    <div className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-zinc-300 mb-2 max-w-md">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <PhoneCall className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        <span className="font-medium">{t("inbox.callCard.title")}</span>
        {message.outcome && (
          <Badge variant="info" className="ml-1">{message.outcome}</Badge>
        )}
      </div>
      {message.recording_url && (
        <div className="my-2">
          <AudioPlayer src={message.recording_url} />
        </div>
      )}
      {duration && (
        <p className="text-[11px] text-zinc-400 mb-1">
          {t("inbox.callCard.duration", { duration })}
        </p>
      )}
      {message.callId && !message.recording_url && (
        <a
          href={`/app/calls/${encodeURIComponent(message.callId)}`}
          className="text-[11px] text-[var(--accent-primary)] hover:opacity-80 underline"
        >
          {t("inbox.callCard.viewCall")}
        </a>
      )}
      <p className="text-[10px] text-zinc-500 mt-1">
        {formatRelative(message.timestamp, t)}
      </p>
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
  const t = useTranslations();

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
        {t("inbox.detail.empty")}
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
            {channelLabel(thread.channel, t)}
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
          {isOpen ? t("inbox.detail.actions.markResolved") : t("inbox.detail.actions.reopen")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <AnimatePresence initial={false}>
          {thread.messages.map((m) => {
            if (m.isCall) {
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <CallCard message={m} />
                </motion.div>
              );
            }
            if (m.sender === "system") {
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center py-1"
                >
                  <p className="text-[11px] text-zinc-500 text-center max-w-[85%]">{m.content}</p>
                </motion.div>
              );
            }
            const isAgent = m.sender === "agent";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isAgent
                      ? "bg-[var(--accent-primary)] text-white rounded-br-sm"
                      : "bg-[var(--bg-input)] text-[var(--text-primary)] rounded-bl-sm border border-[var(--border-default)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isAgent ? "text-white/80" : "text-zinc-500"
                    }`}
                  >
                    {formatRelative(m.timestamp, t)}
                    {m.channel !== thread.channel && (
                      <span className="ml-1 uppercase">· {channelLabel(m.channel, t)}</span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="border-t border-[var(--border-default)] px-3 py-3 bg-[var(--bg-card)]/80">
        <div className="flex items-center gap-2 mb-2 text-[11px] text-zinc-400">
          <span>{t("inbox.detail.replyAs")}</span>
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
              {ch === "sms"
                ? t("inbox.channel.sms")
                : ch === "whatsapp"
                  ? t("inbox.channel.whatsapp")
                  : t("inbox.channel.email")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("inbox.detail.inputPlaceholder")}
            className="flex-1 rounded-xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <Button variant="primary" size="md" onClick={onSend} disabled={!input.trim() || sending}>
            {sending ? t("inbox.detail.sending") : t("inbox.detail.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const t = useTranslations();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId =
    workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialThreads = readInboxSnapshot(snapshotWorkspaceId);
  useEffect(() => {
    document.title = t("inbox.pageTitle");
    return () => { document.title = ""; };
  }, [t]);
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
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

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

        {/* Desktop: three-panel layout — left w-72, center thread, right w-72 collapsible */}
        <div className="hidden md:flex h-[calc(100vh-8rem)] rounded-2xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]/60">
          <div className="w-72 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)]/80 flex flex-col">
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
          {/* Right panel: contact detail — collapsible */}
          <div
            className={`shrink-0 border-l border-[var(--border-default)] bg-[var(--bg-card)]/80 flex flex-col transition-[width] duration-200 ${
              rightPanelOpen ? "w-72" : "w-0 overflow-hidden"
            }`}
          >
            {rightPanelOpen && activeThread && (
              <div className="w-72 flex flex-col h-full">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]">
                  <span className="text-xs font-medium text-zinc-400">{t("inbox.contact")}</span>
                  <button
                    type="button"
                    onClick={() => setRightPanelOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-[var(--bg-hover)]"
                    aria-label={t("common.closeDetails")}
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-sm font-semibold text-zinc-300">
                      {activeThread.contactName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{activeThread.contactName}</p>
                      <p className="text-xs text-zinc-500">{activeThread.contactPhone}</p>
                    </div>
                  </div>
                  <Link
                    href={`/app/leads?highlight=${encodeURIComponent(activeThread.id)}`}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:opacity-80"
                  >
                    <User className="w-3.5 h-3.5" />
                    View in Leads
                  </Link>
                </div>
              </div>
            )}
          </div>
          {!rightPanelOpen && (
            <button
              type="button"
              onClick={() => setRightPanelOpen(true)}
              className="shrink-0 p-2 border-l border-[var(--border-default)] text-zinc-500 hover:text-white hover:bg-[var(--bg-hover)]"
              aria-label={t("inbox.openContactPanel")}
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

