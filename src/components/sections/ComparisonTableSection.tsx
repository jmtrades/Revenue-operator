"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { CheckCircle2, XCircle } from "lucide-react";

export function ComparisonTableSection() {
  const t = useTranslations("homepage.comparisonTable");

  const comparisonData = [
    {
      feature: t("features.0", { default: "AI Voice Agent" }),
      traditional: false,
      recallTouch: true,
    },
    {
      feature: t("features.1", { default: "Real-time Coaching" }),
      traditional: false,
      recallTouch: true,
    },
    {
      feature: t("features.2", { default: "Sentiment Analysis" }),
      traditional: false,
      recallTouch: true,
    },
    {
      feature: t("features.3", { default: "Appointment Booking" }),
      traditional: "Manual",
      recallTouch: "Automated",
    },
    {
      feature: t("features.4", { default: "Missed Call Recovery" }),
      traditional: "None",
      recallTouch: "Instant AI callback",
    },
    {
      feature: t("features.5", { default: "Setup Time" }),
      traditional: "2-4 weeks",
      recallTouch: "5 minutes",
    },
    {
      feature: t("features.6", { default: "Starting Price" }),
      traditional: "$300+/seat",
      recallTouch: "$147/month",
    },
  ];

  return (
    <section
      className="marketing-section py-16 md:py-24"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            {t("title", { default: "Why teams switch to Recall Touch" })}
          </h2>
        </AnimateOnScroll>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <AnimateOnScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className="text-left p-4 font-semibold text-sm"
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    Feature
                  </th>
                  <th
                    className="text-center p-4 font-semibold text-sm"
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--text-secondary)",
                      borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    Traditional Dialers
                  </th>
                  <th
                    className="text-center p-4 font-semibold text-sm"
                    style={{
                      background: "var(--bg-primary)",
                      color: "var(--accent-primary)",
                      borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    Recall Touch
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <td
                      className="p-4 text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {row.feature}
                    </td>
                    <td className="p-4 text-center text-sm">
                      {typeof row.traditional === "boolean" ? (
                        row.traditional ? (
                          <CheckCircle2
                            className="w-5 h-5 mx-auto"
                            style={{ color: "var(--accent-success, #10B981)" }}
                          />
                        ) : (
                          <XCircle
                            className="w-5 h-5 mx-auto"
                            style={{ color: "var(--accent-danger, #EF4444)" }}
                          />
                        )
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>
                          {row.traditional}
                        </span>
                      )}
                    </td>
                    <td
                      className="p-4 text-center text-sm font-medium"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {typeof row.recallTouch === "boolean" ? (
                        row.recallTouch ? (
                          <CheckCircle2
                            className="w-5 h-5 mx-auto"
                            style={{ color: "var(--accent-success, #10B981)" }}
                          />
                        ) : (
                          <XCircle
                            className="w-5 h-5 mx-auto"
                            style={{ color: "var(--accent-danger, #EF4444)" }}
                          />
                        )
                      ) : (
                        <span style={{ color: "var(--accent-primary)" }}>
                          {row.recallTouch}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AnimateOnScroll>
        </div>
      </Container>
    </section>
  );
}
