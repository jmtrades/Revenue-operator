"use client";

import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { SOCIAL_PROOF } from "@/lib/constants";

export function SocialProof() {
  return (
    <section
      id="results"
      className="marketing-section pt-16 pb-16 md:pt-24 md:pb-20"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Traction
          </p>
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Where We Are Today
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              stat: SOCIAL_PROOF.businessCount,
              label: "Businesses Live",
              desc: `Across ${SOCIAL_PROOF.industryCount} industries in ${SOCIAL_PROOF.stateCount} states`,
            },
            {
              stat: SOCIAL_PROOF.callsHandled,
              label: "Calls Handled",
              desc: "Inbound, outbound, and follow-up",
            },
            {
              stat: SOCIAL_PROOF.revenueRecovered,
              label: "Revenue Recovered",
              desc: "From calls that used to go to voicemail",
            },
          ].map((item) => (
            <AnimateOnScroll key={item.label}>
              <div
                className="text-center p-8 rounded-xl"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div
                  className="font-semibold mb-2"
                  style={{
                    fontSize: "2.5rem",
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  {item.stat}
                </div>
                <div
                  className="font-semibold text-base mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.label}
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.desc}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </Container>
    </section>
  );
}
