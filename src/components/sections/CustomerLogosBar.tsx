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
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

interface LogoItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const LOGOS: LogoItem[] = [
  { id: "healthcare", label: "Healthcare", icon: <Hospital className="w-8 h-8" /> },
  { id: "legal", label: "Legal", icon: <Scale className="w-8 h-8" /> },
  { id: "real-estate", label: "Real Estate", icon: <Home className="w-8 h-8" /> },
  { id: "trades", label: "Home Services", icon: <Wrench className="w-8 h-8" /> },
  { id: "automotive", label: "Automotive", icon: <Car className="w-8 h-8" /> },
  { id: "medical", label: "Medical", icon: <Stethoscope className="w-8 h-8" /> },
  { id: "education", label: "Education", icon: <GraduationCap className="w-8 h-8" /> },
  { id: "retail", label: "Retail", icon: <Store className="w-8 h-8" /> },
  { id: "finance", label: "Finance", icon: <Briefcase className="w-8 h-8" /> },
  { id: "enterprise", label: "Enterprise", icon: <Building2 className="w-8 h-8" /> },
];

export function CustomerLogosBar() {
  return (
    <section
      className="marketing-section py-12 md:py-16"
      style={{
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-8">
          <SectionLabel>Trusted by leading businesses</SectionLabel>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Serving every industry imaginable
          </p>
        </AnimateOnScroll>

        <div className="relative">
          {/* Gradient overlays for desktop scrolling effect */}
          <div
            className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none hidden md:block"
            style={{
              background: "linear-gradient(to right, var(--bg-primary), transparent)",
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none hidden md:block"
            style={{
              background: "linear-gradient(to left, var(--bg-primary), transparent)",
            }}
          />

          {/* Desktop scrolling marquee */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .marquee-container {
                animation: marquee 30s linear infinite;
                display: flex;
                gap: 3rem;
              }
              .marquee-container:hover {
                animation-play-state: paused;
              }
            `}</style>

            <div className="flex gap-12 py-8" style={{ width: "max-content" }}>
              {[...LOGOS, ...LOGOS].map((logo, idx) => (
                <div
                  key={`${logo.id}-${idx}`}
                  className="flex flex-col items-center gap-2 min-w-max transition-opacity hover:opacity-100"
                  style={{
                    opacity: 0.6,
                  }}
                >
                  <div
                    className="p-3 rounded-lg transition-colors"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {logo.icon}
                  </div>
                  <span
                    className="text-xs font-medium whitespace-nowrap"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {logo.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile grid */}
          <div className="md:hidden">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {LOGOS.map((logo) => (
                <div
                  key={logo.id}
                  className="flex flex-col items-center gap-2 transition-opacity hover:opacity-100"
                  style={{
                    opacity: 0.6,
                  }}
                >
                  <div
                    className="p-3 rounded-lg transition-colors"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {logo.icon}
                  </div>
                  <span
                    className="text-xs font-medium text-center whitespace-normal"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {logo.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
