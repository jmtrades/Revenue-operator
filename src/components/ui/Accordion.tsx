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
    <div className="border-b border-[var(--border-default)]">
      <button
        type="button"
        className="w-full flex justify-between items-center py-4 text-left cursor-pointer transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 rounded-[var(--radius-btn)] text-[15px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-250 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-250 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="pb-4 text-[14px] leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </div>
    </div>
  );
}
