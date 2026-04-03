"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { CheckCircle2, XCircle, Minus } from "lucide-react";

export function ComparisonTableSection() {
  const t = useTranslations("homepage.comparisonTable");

  const comparisonData = [
    { feature: t("features.0", { default: "AI Voice Agent" }), traditional: false, revenueOperator: true },
    { feature: t("features.1", { default: "Real-time Coaching" }), traditional: false, revenueOperator: true },
    { feature: t("features.2", { default: "Sentiment Analysis" }), traditional: false, revenueOperator: true },
    { feature: t("features.3", { default: "Appointment Booking" }), traditional: "Manual", revenueOperator: "Automated" },
    { feature: t("features.4", { default: "Missed Call Recovery" }), traditional: "None", revenueOperator: "Instant AI callback" },
    { feature: t("features.5", { default: "Setup Time" }), traditional: "2-4 weeks", revenueOperator: "5 minutes" },
    { feature: t("features.6", { default: "Starting Price" }), traditional: "$300+/seat", revenueOperator: "$147/month" },
  ];

  function renderCell(value: boolean | string, isHighlighted: boolean) {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircle2 className="w-5 h-5 mx-auto" style={{ color: "var(--accent-secondary)" }} />
      ) : (
        <Minus className="w-4 h-4 mx-auto" style={{ color: "var(--text-disabled)" }} />
      );
    }
    return (
      <span
        className={isHighlighted ? "font-semibold" : ""}
        style={{ color: isHighlighted ? "var(--accent-primary)" : "var(--text-tertiary)" }}
      >
        {value}
      </span>
    );
  }

  return (
    <section
      className="marketing-section py-16 md:py-24 relative"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)", letterSpacing: "0.1em" }}
          >
            Side-by-side
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
            {t("title", { default: "Why teams switch to Revenue Operator" })}
          </h2>
        </AnimateOnScroll>

        <motion.div
          className="max-w-3xl mx-auto overflow-hidden rounded-2xl"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-md)",
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left px-6 py-4 font-semibold text-sm"
                  style={{
                    color: "var(--text-primary)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                  scope="col"
                >
                  Feature
                </th>
                <th
                  className="text-center px-4 py-4 font-medium text-sm"
                  style={{
                    color: "var(--text-tertiary)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                  scope="col"
                >
                  Traditional
                </th>
                <th
                  className="text-center px-4 py-4 font-semibold text-sm relative"
                  style={{
                    color: "var(--accent-primary)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                  scope="col"
                >
                  Revenue Operator
                  {/* Highlight column indicator */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: "var(--accent-primary)" }}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, idx) => (
                <motion.tr
                  key={idx}
                  style={{
                    borderBottom: idx < comparisonData.length - 1 ? "1px solid var(--border-subtle, var(--border-default))" : "none",
                  }}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                >
                  <td
                    className="px-6 py-4 text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {row.feature}
                  </td>
                  <td className="px-4 py-4 text-center text-sm">
                    {renderCell(row.traditional, false)}
                  </td>
                  <td
                    className="px-4 py-4 text-center text-sm"
                    style={{
                      background: "rgba(37,99,235,0.02)",
                    }}
                  >
                    {renderCell(row.revenueOperator, true)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </Container>
    </section>
  );
}
