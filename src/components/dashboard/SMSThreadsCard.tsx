"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  User,
  Clock,
  X,
  Loader2,
} from "lucide-react";

interface SMSThread {
  id: string;
  lead_id: string | null;
  contact_phone: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  created_at: string;
}

interface SMSMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: string;
  from_number: string;
  to_number: string;
  created_at: string;
}

function maskPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `***-***-${digits.slice(-4)}`;
  }
  return phone;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SMSThreadsCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [threads, setThreads] = useState<SMSThread[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<SMSThread | null>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchThreads = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sms/threads?workspace_id=${encodeURIComponent(workspaceId)}&limit=10`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setThreads(json.threads ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const openThread = async (thread: SMSThread) => {
    setSelectedThread(thread);
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/sms/threads?workspace_id=${encodeURIComponent(workspaceId)}&thread_id=${thread.id}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setMessages(json.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div className="dash-section p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            SMS Conversations
          </h2>
          {total > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]">
              {total}
            </span>
          )}
        </div>
        {selectedThread && (
          <button
            onClick={() => { setSelectedThread(null); setMessages([]); }}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Back to threads
          </button>
        )}
      </div>

      {/* Thread detail view */}
      {selectedThread ? (
        <div>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border-default)]">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-primary-subtle)] flex items-center justify-center">
              <User className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {selectedThread.contact_name || maskPhone(selectedThread.contact_phone)}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)]">{maskPhone(selectedThread.contact_phone)}</p>
            </div>
          </div>
          {loadingMessages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-disabled)]" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No messages in this thread</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                      msg.direction === "outbound"
                        ? "bg-[var(--accent-primary)] text-white rounded-br-sm"
                        : "bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-bl-sm"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.body}</p>
                    <div className={`flex items-center gap-1 mt-1 ${
                      msg.direction === "outbound" ? "text-white/60" : "text-[var(--text-disabled)]"
                    }`}>
                      {msg.direction === "outbound" ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownLeft className="w-3 h-3" />
                      )}
                      <span className="text-[10px]">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                      {msg.direction === "outbound" && (
                        <span className="text-[10px] ml-1">
                          {msg.status === "delivered" ? "✓✓" : msg.status === "sent" ? "✓" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Thread list */
        <>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-[var(--text-disabled)] mb-2" />
              <p className="text-sm text-[var(--text-secondary)]">No SMS conversations yet</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Conversations will appear here when leads receive or send texts
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => openThread(thread)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--bg-hover)] group-hover:bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[var(--text-disabled)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {thread.contact_name || maskPhone(thread.contact_phone)}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {thread.last_message_at && (
                          <span className="text-[11px] text-[var(--text-disabled)]">
                            {timeAgo(thread.last_message_at)}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-disabled)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                      {thread.last_message || "No messages"}
                    </p>
                  </div>
                  {thread.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {thread.unread_count > 9 ? "9+" : thread.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
