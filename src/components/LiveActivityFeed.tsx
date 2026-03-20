"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, Calendar, MessageSquare, TrendingUp, Clock } from "lucide-react";

/* ─── Activity Templates ─── */
const ACTIVITIES = [
  { icon: Phone, color: "emerald", verb: "answered a call", industry: "plumbing", location: "Houston, TX" },
  { icon: Calendar, color: "blue", verb: "booked an appointment", industry: "dental", location: "Miami, FL" },
  { icon: Phone, color: "emerald", verb: "recovered a missed call", industry: "HVAC", location: "Phoenix, AZ" },
  { icon: MessageSquare, color: "purple", verb: "sent a follow-up", industry: "legal", location: "Chicago, IL" },
  { icon: TrendingUp, color: "amber", verb: "converted a lead", industry: "roofing", location: "Dallas, TX" },
  { icon: Phone, color: "emerald", verb: "handled an inquiry", industry: "medical spa", location: "Los Angeles, CA" },
  { icon: Calendar, color: "blue", verb: "scheduled a consultation", industry: "law firm", location: "New York, NY" },
  { icon: Phone, color: "emerald", verb: "answered after hours", industry: "auto repair", location: "Atlanta, GA" },
  { icon: MessageSquare, color: "purple", verb: "sent appointment reminder", industry: "salon", location: "Denver, CO" },
  { icon: TrendingUp, color: "amber", verb: "recovered $2,400 in revenue", industry: "contractor", location: "Seattle, WA" },
  { icon: Phone, color: "emerald", verb: "answered a call", industry: "restaurant", location: "Nashville, TN" },
  { icon: Calendar, color: "blue", verb: "booked a service call", industry: "electrician", location: "San Diego, CA" },
  { icon: Phone, color: "emerald", verb: "handled a new patient call", industry: "chiropractor", location: "Austin, TX" },
  { icon: TrendingUp, color: "amber", verb: "saved a $1,800 lead", industry: "real estate", location: "Portland, OR" },
  { icon: MessageSquare, color: "purple", verb: "qualified an inbound lead", industry: "insurance", location: "Tampa, FL" },
  { icon: Phone, color: "emerald", verb: "answered in 0.8 seconds", industry: "veterinary", location: "Charlotte, NC" },
];

const BUSINESS_NAMES = [
  "A business", "A company", "A local business", "A team",
];

const TIME_AGO = [
  "just now", "2s ago", "5s ago", "8s ago", "12s ago", "18s ago", "25s ago",
];

const COLORS: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "rgba(16,185,129,0.1)", text: "rgb(52,211,153)", border: "rgba(16,185,129,0.2)" },
  blue: { bg: "rgba(59,130,246,0.1)", text: "rgb(96,165,250)", border: "rgba(59,130,246,0.2)" },
  purple: { bg: "rgba(139,92,246,0.1)", text: "rgb(167,139,250)", border: "rgba(139,92,246,0.2)" },
  amber: { bg: "rgba(245,158,11,0.1)", text: "rgb(252,211,77)", border: "rgba(245,158,11,0.2)" },
};

interface FeedItem {
  id: number;
  activity: (typeof ACTIVITIES)[number];
  time: string;
  businessName: string;
}

export function LiveActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [counter, setCounter] = useState(0);

  const addItem = useCallback(() => {
    setCounter((c) => {
      const activity = ACTIVITIES[c % ACTIVITIES.length];
      const businessName = BUSINESS_NAMES[Math.floor(Math.random() * BUSINESS_NAMES.length)];
      const newItem: FeedItem = {
        id: Date.now() + Math.random(),
        activity,
        time: TIME_AGO[0],
        businessName,
      };

      setItems((prev) => [newItem, ...prev].slice(0, 4));
      return c + 1;
    });
  }, []);

  useEffect(() => {
    // Start with 2 items
    addItem();
    const t1 = setTimeout(() => addItem(), 800);

    // Add new items every 4-7 seconds
    const interval = setInterval(() => {
      addItem();
    }, 4000 + Math.random() * 3000);

    return () => {
      clearTimeout(t1);
      clearInterval(interval);
    };
  }, [addItem]);

  // Update times
  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((item, i) => ({
          ...item,
          time: TIME_AGO[Math.min(i, TIME_AGO.length - 1)],
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5 max-w-sm w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
          What businesses are doing with Recall Touch
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const c = COLORS[item.activity.color];
          const Icon = item.activity.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 py-2 px-3 rounded-xl transition-all"
              style={{
                background: index === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                opacity: 1 - index * 0.15,
                animation: index === 0 ? "slideIn 0.4s ease-out" : undefined,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: c.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 leading-relaxed">
                  <span className="font-medium text-white/90">{item.activity.industry}</span>{" "}
                  {item.activity.verb}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {item.time} · {item.activity.location}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
