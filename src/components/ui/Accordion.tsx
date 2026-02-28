"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border-default)" }}>
      <button
        type="button"
        className="w-full flex justify-between items-center py-5 text-left bg-none border-none cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded"
        style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 500 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className="w-5 h-5 shrink-0 transition-transform duration-200"
          style={{ color: "var(--text-tertiary)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open && (
        <div className="pb-5 text-[0.9375rem] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
