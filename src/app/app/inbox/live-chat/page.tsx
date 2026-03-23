"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceContext";
import { ArrowLeft, Send, CheckCircle, Clock } from "lucide-react";

interface ChatSession {
  id: string;
  workspace_id: string;
  visitor_name: string;
  visitor_email?: string;
  session_token: string;
  status: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  session_id: string;
  message_text: string;
  sender_type: "visitor" | "agent";
  sender_name?: string;
  is_read: boolean;
  created_at: string;
}

export default function LiveChatInboxPage() {
  const { workspaceId } = useWorkspace();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load sessions
  useEffect(() => {
    if (!workspaceId) return;

    const loadSessions = async () => {
      try {
        const res = await fetch(
          `/api/chat-widget/sessions?status=active`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = (await res.json()) as ChatSession[];
          setSessions(data);
          if (!selectedSessionId && data.length > 0) {
            setSelectedSessionId(data[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };

    loadSessions();

    // Refresh sessions every 5 seconds
    refreshIntervalRef.current = setInterval(loadSessions, 5000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [workspaceId, selectedSessionId]);

  // Load messages for selected session
  useEffect(() => {
    if (!selectedSessionId) return;

    const loadMessages = async () => {
      try {
        const res = await fetch(
          `/api/chat-widget/messages?session_id=${encodeURIComponent(selectedSessionId)}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = (await res.json()) as ChatMessage[];
          setMessages(data);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    loadMessages();

    // Refresh messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!selectedSessionId || !messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      const res = await fetch("/api/chat-widget/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSessionId,
          message_text: text,
          sender_type: "agent",
          sender_name: "Agent",
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({
          error: "Failed to send message",
        }))) as { error?: string };
        toast.error(errorData.error || "Failed to send message");
        setMessageText(text);
        return;
      }

      // Refresh messages
      const messagesRes = await fetch(
        `/api/chat-widget/messages?session_id=${encodeURIComponent(selectedSessionId)}`,
        { credentials: "include" }
      );
      if (messagesRes.ok) {
        const data = (await messagesRes.json()) as ChatMessage[];
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  // Resolve session
  const handleResolveSession = async () => {
    if (!selectedSessionId) return;

    try {
      const res = await fetch(
        `/api/chat-widget/sessions/${encodeURIComponent(selectedSessionId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "resolved" }),
        }
      );

      if (res.ok) {
        toast.success("Chat session marked as resolved");
        setSessions(sessions.filter((s) => s.id !== selectedSessionId));
        setSelectedSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to resolve session:", error);
      toast.error("Failed to resolve session");
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/app/inbox"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Live Chat Inbox</h1>
        </div>
        <p className="text-sm text-gray-600 ml-11">
          Manage and respond to visitor chat messages
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sessions List */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-sm font-medium">No active chat sessions</p>
                <p className="text-xs mt-1">
                  Chat sessions will appear here when visitors connect
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-l-2 ${
                    selectedSessionId === session.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.visitor_name}
                      </p>
                      {session.visitor_email && (
                        <p className="text-xs text-gray-500 truncate">
                          {session.visitor_email}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(session.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {(session.unread_count || 0) > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {session.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Thread */}
        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedSession.visitor_name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedSession.visitor_email || "No email provided"}
                  </p>
                </div>
                <button
                  onClick={handleResolveSession}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_type === "agent"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender_type === "agent"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-200 text-gray-900 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.message_text}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    disabled={sending}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !messageText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p className="text-sm">Select a chat session to start responding</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
