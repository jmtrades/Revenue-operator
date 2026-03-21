"use client";

import React from "react";
import { Container } from "@/components/ui/Container";

const INDUSTRIES = [
  "Healthcare",
  "Legal",
  "Real Estate",
  "Home Services",
  "Automotive",
  "Dental",
  "Insurance",
  "Financial Services",
  "Recruiting",
  "SaaS",
];

export function CustomerLogosBar() {
  return (
    <section
      className="py-5"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <Container>
        <div className="flex items-center justify-center gap-x-2 flex-wrap">
          <span
            className="text-xs font-medium mr-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Built for:
          </span>
          {INDUSTRIES.map((name, i) => (
            <React.Fragment key={name}>
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {name}
              </span>
              {i < INDUSTRIES.length - 1 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--border-hover)" }}
                >
                  /
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </Container>
    </section>
  );
}
