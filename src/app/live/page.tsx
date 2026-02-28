"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { WorkspaceGate } from "@/components/WorkspaceGate";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface TimelineStep {
  id: string;
  step: "message_received" | "understanding_intent" | "preparing_reply" | "reply_sent";
  label: string;
  completed: boolean;
  timestamp?: string;
  message?: string;
}

function LivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId: contextWid, workspaces, loading } = useWorkspace();
  const urlWid = searchParams.get("workspace_id") ?? "";
  const urlConvId = searchParams.get("conversation_id") ?? null;
  const workspaceId = urlWid || contextWid || "";
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(urlConvId);
  const [messages, setMessages] = useState<Array<{ role: string; content: string; created_at: string }>>([]);
  const [isReady, setIsReady] = useState(false);
  const [autoSimulated, setAutoSimulated] = useState(false);

  useEffect(() => {
    if (!loading && workspaces.length === 0) {
      router.replace("/activate");
      return;
    }
    if (contextWid && !urlWid) {
      router.replace(`/live?workspace_id=${encodeURIComponent(contextWid)}`);
      return;
    }
  }, [loading, workspaces.length, contextWid, urlWid, router]);

  // Show prompt if no activity after 45s (production only - no auto-simulate)
  const [showPrompt, setShowPrompt] = useState(false);
  const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";

  useEffect(() => {
    if (!workspaceId || autoSimulated || !isProduction) return;

    const timer = setTimeout(() => {
      if (messages.length === 0) {
        setShowPrompt(true);
      }
    }, 45000);

    return () => clearTimeout(timer);
  }, [workspaceId, autoSimulated, messages.length, isProduction]);

  // Auto-simulate only in dev
  useEffect(() => {
    if (!workspaceId || autoSimulated || isProduction) return;

    const timer = setTimeout(async () => {
      // Check if we have any conversations
      const checkRes = await fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`);
      const checkData = await checkRes.json();
      
      if (!checkData.activity || checkData.activity.length === 0) {
        // Auto-simulate in dev only
        try {
          await fetch("/api/dev/simulate-inbound", { method: "POST" });
          setAutoSimulated(true);
        } catch (error) {
          console.error("[live] Auto-simulate failed", error);
        }
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [workspaceId, autoSimulated, isProduction]);

  // Sync conversation_id from URL
  useEffect(() => {
    if (urlConvId && urlConvId !== conversationId) setConversationId(urlConvId);
  }, [urlConvId]);

  // Poll for conversation events (1s for 20s then 2s)
  useEffect(() => {
    if (!workspaceId) return;

    const fetchConversationEvents = async () => {
      const result = await fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`);
      const data = await result.json();

      if (data.recent_conversations && Array.isArray(data.recent_conversations) && data.recent_conversations.length > 0) {
        const latestConv = data.recent_conversations[0];
        const convId = latestConv.id;

        if (convId && convId !== conversationId) {
          setConversationId(convId);
        }
        
        if (convId) {
          try {
            const msgRes = await fetch(`/api/conversations/${convId}/messages`);
            const msgData = await msgRes.json();

            if (msgData.messages && Array.isArray(msgData.messages)) {
              setMessages(msgData.messages);

              // Build timeline from messages
              const steps: TimelineStep[] = [];
              const userMessages = msgData.messages.filter((m: { role: string }) => m.role === "user");
              const assistantMessages = msgData.messages.filter((m: { role: string }) => m.role === "assistant");

              if (userMessages.length > 0) {
                const firstUserMsg = userMessages[0];
                steps.push({
                  id: "step-1",
                  step: "message_received",
                  label: "Message received",
                  completed: true,
                  timestamp: firstUserMsg.created_at,
                  message: firstUserMsg.content,
                });
                steps.push({
                  id: "step-2",
                  step: "understanding_intent",
                  label: "Understanding intent",
                  completed: !!firstUserMsg.conversation_state,
                  timestamp: firstUserMsg.created_at,
                });
              }

              if (assistantMessages.length > 0) {
                const firstAssistantMsg = assistantMessages[0];
                steps.push({
                  id: "step-3",
                  step: "preparing_reply",
                  label: "Keeping decision on track",
                  completed: true,
                  timestamp: firstAssistantMsg.created_at,
                });
                steps.push({
                  id: "step-4",
                  step: "reply_sent",
                  label: "Follow-through protected",
                  completed: true,
                  timestamp: firstAssistantMsg.created_at,
                  message: firstAssistantMsg.content,
                });
                setIsReady(true);
                
                // Auto-redirect after 3 seconds
                setTimeout(() => {
                  router.push(workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard");
                }, 3000);
              } else if (userMessages.length > 0) {
                // Inbound exists but no outbound yet
                steps.push({
                  id: "step-3",
                  step: "preparing_reply",
                  label: "Keeping decision on track",
                  completed: false,
                });
              }

              setTimeline(steps);
            }
          } catch (error) {
            console.error("[live] Failed to fetch messages", error);
          }
        }
      }
    };

    fetchConversationEvents();
    const interval = setInterval(fetchConversationEvents, 1000); // Poll every 1 second
    return () => clearInterval(interval);
  }, [workspaceId, conversationId]);

  const handleContinue = () => {
    router.push(workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard");
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-2" style={{ background: "var(--meaning-amber)" }} aria-hidden />
        <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        background: "var(--background)",
        color: "var(--text-primary)",
      }}
    >
      <div className="max-w-md w-full">
        <div
          className="rounded-xl border p-8"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            borderWidth: "1px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <h1 className="text-xl font-semibold mb-6 text-center" style={{ color: "var(--text-primary)" }}>
            Follow-through is being protected
          </h1>

          {/* Timeline */}
          <div className="space-y-4 mb-6">
            {timeline.length > 0 ? (
              timeline.map((step, i) => (
                <div key={step.id || i} className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">
                    {step.completed ? (
                      <span className="inline-block w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--meaning-green)" }}>
                        <span className="text-xs" style={{ color: "#0c0f13" }}>✓</span>
                      </span>
                    ) : (
                      <span className="inline-block w-5 h-5 rounded-full border-2 border-current animate-pulse" style={{ borderColor: "var(--meaning-amber)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1" style={{ color: step.completed ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {step.label}
                    </p>
                    {step.message && (
                      <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: step.step === "reply_sent" ? "var(--surface)" : "var(--background)", borderColor: "var(--border)", borderWidth: "1px" }}>
                        <p style={{ color: "var(--text-primary)" }}>{step.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : showPrompt ? (
              <div className="text-center py-8 p-4 rounded-lg" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
                <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>Text the number from your phone to see it work.</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Send: &quot;Hi, I&apos;m interested&quot;</p>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                <p className="text-sm">Waiting for next step…</p>
              </div>
            )}
          </div>

          {/* Chat bubbles if messages exist */}
          {messages.length > 0 && (
            <>
              <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                {messages.map((msg: { role: string; content: string; created_at: string }, i: number) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[80%] p-3 rounded-lg text-sm"
                      style={{
                        background: msg.role === "user" ? "var(--meaning-blue)" : "var(--surface)",
                        color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                        borderColor: "var(--border)",
                        borderWidth: msg.role === "assistant" ? "1px" : "0",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              {isReady && messages.some((m: { role: string }) => m.role === "assistant") && (
                <p className="text-xs text-center mb-4" style={{ color: "var(--text-muted)" }}>
                  You can step in at any time — nothing is locked.
                </p>
              )}
            </>
          )}

          {isReady && (
            <>
              <p className="text-base font-medium py-4 text-center" style={{ color: "var(--text-primary)" }}>
                This continues under governance
              </p>
              <button
                onClick={handleContinue}
                className="mt-4 w-full py-3.5 rounded-lg font-medium transition-opacity hover:opacity-90"
                style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </div>
    }>
      <WorkspaceGate>
        <LivePageContent />
      </WorkspaceGate>
    </Suspense>
  );
}
