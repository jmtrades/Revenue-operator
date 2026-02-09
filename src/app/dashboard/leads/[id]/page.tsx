"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  state: string;
  last_activity_at: string;
  opt_out?: boolean;
}

interface Message {
  role: string;
  content: string;
  created_at: string;
}

export default function LeadViewPage() {
  const params = useParams();
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/leads/${id}`).then((r) => r.json()),
      fetch(`/api/leads/${id}/messages`).then((r) => r.json()),
    ])
      .then(([l, m]) => {
        setLead(l.error ? null : l);
        setMessages(m.messages ?? []);
      })
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-stone-400">Loading…</div>;
  if (!lead) return <div className="p-8 text-red-400">Lead not found</div>;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">{lead.name || lead.email || "Unknown"}</h1>
          <p className="text-stone-400">{lead.company}</p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded bg-stone-800 text-sm">{lead.state}</span>
          {lead.opt_out && (
            <span className="inline-block ml-2 mt-2 px-2 py-0.5 rounded bg-red-900/50 text-red-200 text-sm font-medium">OPTED OUT</span>
          )}
          <p className="text-xs text-stone-500 mt-1">Last activity: {new Date(lead.last_activity_at).toLocaleString()}</p>
        </div>
        <div>
          <h2 className="text-lg font-medium mb-4">Timeline</h2>
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${m.role === "user" ? "bg-stone-800" : "bg-stone-900"}`}
              >
                <span className="text-xs text-stone-500">{m.role} · {new Date(m.created_at).toLocaleString()}</span>
                <p className="mt-1">{m.content}</p>
              </div>
            ))}
            {messages.length === 0 && <p className="text-stone-500">No messages yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
