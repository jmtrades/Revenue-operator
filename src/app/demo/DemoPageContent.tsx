"use client";

import { useState } from "react";
import { LiveAgentChat } from "@/components/LiveAgentChat";

const DEMO_INDUSTRIES = [
  { id: "plumbing", label: "Plumbing & HVAC", businessName: "Riverside Plumbing", greeting: "Hi there! Thanks for calling Riverside Plumbing. This is Sarah — what can I help you with?" },
  { id: "dental", label: "Dental", businessName: "Summit Dental", greeting: "Hi! Thanks for calling Summit Dental. This is Sarah — how can I help you today?" },
  { id: "legal", label: "Legal", businessName: "Morgan & Associates", greeting: "Good afternoon, Morgan & Associates. This is Sarah speaking. How may I help you?" },
  { id: "real-estate", label: "Real Estate", businessName: "Parkview Realty", greeting: "Hi! Thanks for calling Parkview Realty. This is Sarah — what can I help you with?" },
  { id: "healthcare", label: "Healthcare", businessName: "Valley Medical", greeting: "Thank you for calling Valley Medical. This is Sarah — how can I help you today?" },
] as const;

export function DemoPageContent() {
  const [industryId, setIndustryId] = useState<(typeof DEMO_INDUSTRIES)[number]["id"]>("plumbing");
  const industry = DEMO_INDUSTRIES.find((i) => i.id === industryId) ?? DEMO_INDUSTRIES[0];

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 text-center mb-6">
        <h1 className="font-bold text-3xl md:text-4xl mb-2" style={{ letterSpacing: "-0.02em" }}>
          Talk to your future AI receptionist
        </h1>
        <p className="text-base mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Speak or type — this is the same AI that handles real calls.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-zinc-500 mr-1">Industry:</span>
          {DEMO_INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              type="button"
              onClick={() => setIndustryId(ind.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                industryId === ind.id
                  ? "bg-white text-black border-white"
                  : "border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-500"
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4">
        <LiveAgentChat
          key={industryId}
          variant="demo"
          initialAgent="sarah"
          showMic
          businessName={industry.businessName}
          greeting={industry.greeting}
        />
      </div>
    </>
  );
}
