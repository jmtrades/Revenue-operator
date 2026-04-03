"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { Play, X } from "lucide-react";

/**
 * ProductDemoVideo — Cinematic product showcase section.
 *
 * Shows an inline video preview with a lightbox for full-screen viewing.
 * When no video src is set, renders a premium placeholder with animated
 * gradient background and play button, ready for the production video.
 *
 * To activate with real video: set VIDEO_SRC to your hosted .mp4 / .webm URL.
 */

const VIDEO_SRC = ""; // Set to your hosted video URL, e.g. "/videos/product-demo.mp4"
const VIDEO_POSTER = ""; // Set to poster/thumbnail image URL

export function ProductDemoVideo() {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  return (
    <>
      <section
        className="relative py-20 md:py-28 overflow-hidden"
        style={{ background: "var(--bg-primary)" }}
      >
        {/* Subtle background glow behind video */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-[0.04] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, var(--accent-primary) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        <Container className="relative z-10">
          <AnimateOnScroll className="text-center mb-12">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--accent-primary)", letterSpacing: "0.1em" }}
            >
              See It In Action
            </p>
            <h2
              className="font-semibold mb-4"
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: "var(--text-primary)",
              }}
            >
              Watch how businesses are closing
              <br className="hidden sm:block" />
              <span style={{ color: "var(--accent-primary)" }}> every missed opportunity</span>
            </h2>
            <p
              className="text-base md:text-lg max-w-xl mx-auto leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Real conversations. Real results. See Revenue Operator handle calls,
              book appointments, and recover revenue — autonomously.
            </p>
          </AnimateOnScroll>

          {/* Video container with cinema frame */}
          <AnimateOnScroll className="max-w-4xl mx-auto">
            <motion.div
              className="relative cursor-pointer"
              onClick={VIDEO_SRC ? openLightbox : undefined}
              whileHover={VIDEO_SRC ? { y: -4 } : undefined}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Glow frame behind video */}
              <div
                className="absolute -inset-[1px] rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(135deg, var(--accent-primary), transparent, var(--accent-primary))",
                  filter: "blur(2px)",
                }}
              />

              <VideoPlayer
                src={VIDEO_SRC || undefined}
                poster={VIDEO_POSTER || undefined}
                placeholder={!VIDEO_SRC}
                title="Revenue Operator Product Demo"
                subtitle="2 min · See the full platform in action"
                autoPlay={false}
                loop={false}
              />

              {/* Corner badge */}
              <div
                className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#ef4444", animation: "breathing 2s ease-in-out infinite" }}
                />
                <span className="text-white/80 text-[11px] font-medium tracking-wide uppercase">
                  Product Demo
                </span>
              </div>
            </motion.div>

            {/* Stats row below video */}
            <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
              {[
                { value: "47s", label: "Avg. response time" },
                { value: "94%", label: "Appointment rate" },
                { value: "3.2x", label: "Revenue increase" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p
                    className="text-xl md:text-2xl font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </Container>
      </section>

      {/* Lightbox modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.92)" }}
              onClick={closeLightbox}
              role="presentation"
            />

            {/* Close button */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-6 right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full transition-colors"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              aria-label="Close video"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Video */}
            <motion.div
              className="relative z-40 w-full max-w-5xl mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <VideoPlayer
                src={VIDEO_SRC || undefined}
                placeholder={!VIDEO_SRC}
                title="Revenue Operator Product Demo"
                autoPlay
                loop={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
