"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState, LoadingState } from "@/components/ui";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Conversation {
  lead_id: string;
  lead_name: string | null;
  lead_email: string | null;
  company: string | null;
  state: string;
  last_activity_at: string;
  opt_out: boolean;
}

interface Msg {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function MessagesPage() {
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const openLeadId = searchParams.get("lead") ?? null;

  const [tab, setTab] = useState<"outbox" | "inbox">("inbox");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(openLeadId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (openLeadId) setSelectedLeadId(openLeadId);
  }, [openLeadId]);

  const loadConversations = () => {
    if (!workspaceId) return;
    setLoading(true);
    setListError(null);
    fetchWithFallback<{ conversations: Conversation[] }>(
      `/api/conversations?workspace_id=${encodeURIComponent(workspaceId)}`
    )
      .then((res) => {
        if (res.data?.conversations) setConversations(res.data.conversations);
        else setConversations([]);
        if (res.error) setListError(res.error);
      })
      .catch(() => setListError("Could not load conversations."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!workspaceId) {
      setConversations([]);
      setLoading(false);
      setListError(null);
      return;
    }
    loadConversations();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !selectedLeadId) {
      setMessages([]);
      return;
    }
    fetchWithFallback<{ conversation_id: string; messages: Msg[] }>(
      `/api/conversations/${selectedLeadId}/messages`,
      { credentials: "include" }
    ).then((res) => {
      if (res.data?.messages) setMessages(res.data.messages);
    });
  }, [workspaceId, selectedLeadId]);

  const selectedConv = conversations.find((c) => c.lead_id === selectedLeadId);
  const sendMessage = async () => {
    if (!workspaceId || !selectedLeadId || !reply.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const r = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: selectedLeadId, content: reply.trim() }),
        credentials: "include",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Send failed");
      const sentContent = reply.trim();
      setReply("");
      setMessages((prev) => [
        ...prev,
        { id: "sent", role: "assistant", content: sentContent, created_at: new Date().toISOString() },
      ]);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Messages" subtitle="Outbox and inbox." />
        <EmptyState icon="watch" title="Select a context." subtitle="Messages appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Messages" subtitle="Two-way SMS with contacts." />
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={() => setTab("inbox")}
          className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
          style={{
            borderColor: tab === "inbox" ? "var(--accent)" : "transparent",
            color: tab === "inbox" ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          Inbox
        </button>
        <button
          type="button"
          onClick={() => setTab("outbox")}
          className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
          style={{
            borderColor: tab === "outbox" ? "var(--accent)" : "transparent",
            color: tab === "outbox" ? "var(--text-primary)" : "var(--text-muted)",
          }}
        >
          Outbox
        </button>
      </div>

      <div className="flex gap-4 rounded-lg border overflow-hidden min-h-[400px]" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <div className="w-64 border-r flex-shrink-0 overflow-y-auto" style={{ borderColor: "var(--border)" }}>
          {loading ? (
            <div className="p-4"><LoadingState message="Loading." submessage="Conversations" className="min-h-[120px]" /></div>
          ) : listError ? (
            <div className="p-4 text-center">
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{listError}</p>
              <button type="button" onClick={loadConversations} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>Retry</button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.lead_id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 border-b hover:bg-opacity-80"
                    style={{
                      borderColor: "var(--border)",
                      background: selectedLeadId === c.lead_id ? "var(--bg-elevated)" : "transparent",
                      color: "var(--text-primary)",
                    }}
                    onClick={() => setSelectedLeadId(c.lead_id)}
                  >
                    <p className="text-sm font-medium truncate">{c.lead_name || c.lead_email || c.company || "Contact"}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{c.state}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {selectedLeadId ? (
            <>
              <div className="p-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {selectedConv?.lead_name || selectedConv?.lead_email || selectedConv?.company || "Contact"}
                </p>
                <Link href={`/dashboard/record/lead/${selectedLeadId}${q ? `?${q.replace("lead=", "workspace_id=")}` : ""}`} className="text-xs" style={{ color: "var(--accent)" }}>
                  View record
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id || m.created_at}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-0 mr-auto" : "ml-auto mr-0"}`}
                    style={{
                      background: m.role === "user" ? "var(--bg-elevated)" : "var(--accent-primary-subtle)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {m.content}
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{new Date(m.created_at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
              {sendError && (
                <p className="px-4 py-2 text-xs" style={{ color: "var(--accent-danger)" }}>{sendError}</p>
              )}
              <div className="p-4 border-t flex-shrink-0 flex gap-2" style={{ borderColor: "var(--border)" }}>
                <input
                  type="text"
                  placeholder="Type a message…"
                  className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                />
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
                  onClick={sendMessage}
                  disabled={!reply.trim() || sending}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              Select a conversation or send from Record.
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/messages/compose${q}`} style={{ color: "var(--meaning-blue)" }}>Compose</Link>
        {" · "}
        <Link href={`/dashboard/templates${q}`} style={{ color: "var(--text-muted)" }}>Templates</Link>
      </p>
    </div>
  );
}
