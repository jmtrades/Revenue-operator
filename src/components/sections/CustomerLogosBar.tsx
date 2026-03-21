"use client";

import React from "react";
import {
  Building2,
  Hospital,
  Scale,
  Home,
  Wrench,
  Car,
  Stethoscope,
  GraduationCap,
  Store,
  Briefcase,
} from "lucide-react";
import { Container } from "@/components/ui/Container";

const LOGOS = [
  { id: "healthcare", label: "Healthcare", Icon: Hospital },
  { id: "legal", label: "Legal", Icon: Scale },
  { id: "real-estate", label: "Real Estate", Icon: Home },
  { id: "trades", label: "Home Services", Icon: Wrench },
  { id: "automotive", label: "Automotive", Icon: Car },
  { id: "medical", label: "Medical", Icon: Stethoscope },
  { id: "education", label: "Education", Icon: GraduationCap },
  { id: "retail", label: "Retail", Icon: Store },
  { id: "finance", label: "Finance", Icon: Briefcase },
  { id: "enterprise", label: "Enterprise", Icon: Building2 },
];

export function CustomerLogosBar() {
  return (
    <section
      className="py-6 border-b"
      style={{
        background: "var(--bg-surface, #f5f5f0)",
        borderColor: "var(--border-default, #e5e5e0)",
      }}
    >
      <Container>
        <p
          className="text-center text-xs font-medium tracking-wider uppercase mb-4"
          style={{ color: "var(--text-tertiary, #8a8a80)" }}
        >
          Trusted across every industry
        </p>
        <div className="flex items-center justify-center gap-6 md:gap-8 flex-wrap">
          {LOGOS.map((logo) => (
            <div
              key={logo.id}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-100"
              style={{ opacity: 0.85 }}
            >
              <logo.Icon
                className="w-4 h-4"
                style={{ color: "var(--text-secondary, #4a4a4a)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-secondary, #4a4a4a)" }}
              >
                {logo.label}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
