"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";

const INDUSTRIES = ["Plumbing", "Dental", "Law firm", "Real estate", "Insurance", "Restaurant"] as const;

export function HomepageLiveDemo() {
  const [activeIndustry, setActiveIndustry] = useState<(typeof INDUSTRIES)[number]>("Plumbing");
  const [playing, setPlaying] = useState(false);

  return (
    <section
      id="live-audio-demo"
      className="py-16 md:py-20 border-t border-zinc-800/60"
      style={{ background: "#020617" }}
    >
      <Container>
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-semibold text-white">
              Hear the difference in 30 seconds
            </h2>
            <p className="mt-2 text-sm md:text-base text-zinc-400">
              Pick an industry, press play, and experience how a calm receptionist handles real revenue calls without missing a beat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((label) => {
              const isActive = label === activeIndustry;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveIndustry(label)}
                  className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm border transition-colors ${
                    isActive
                      ? "bg-white text-black border-white"
                      : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 items-stretch mt-2">
            <motion.div
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6 flex flex-col justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase text-zinc-500">
                    Listen
                  </p>
                  <p className="text-sm text-zinc-300 mt-1">
                    {activeIndustry} reception call, ~30 seconds
                  </p>
                </div>
                <span className="text-[11px] text-zinc-500">Demo recording</span>
              </div>
              <div className="flex-1 flex flex-col justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-sm text-zinc-100 hover:border-zinc-500 transition-colors w-full"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      playing ? "bg-zinc-200 text-black" : "bg-white text-black"
                    }`}
                  >
                    {playing ? "❚❚" : "▶"}
                  </span>
                  <span className="flex-1 text-left">
                    {playing ? "Playing sample…" : "Play sample call"}
                  </span>
                  <span className="text-[11px] text-zinc-500">00:32</span>
                </button>
                <div className="relative h-20 mt-1 rounded-xl bg-zinc-950/70 border border-zinc-800 overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 flex items-end gap-[3px] px-3 pb-3">
                    {Array.from({ length: 64 }).map((_, i) => {
                      const base = 8 + ((i * 19) % 40);
                      const height = base;
                      const delay = (i % 12) * 0.12;
                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: decorative only
                        <span
                          key={i}
                          className={`w-[3px] rounded-full ${
                            playing ? "animate-[pulseWave_1.4s_ease-in-out_infinite]" : ""
                          }`}
                          style={{
                            height,
                            backgroundImage:
                              "linear-gradient(to top, rgba(59,130,246,0.15), rgba(59,130,246,0.9))",
                            opacity: playing ? 1 : 0.4,
                            animationDelay: `${delay}s`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Sample call — hear how your AI receptionist handles a real inquiry.
                </p>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6 flex flex-col justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <div className="mb-4">
                <p className="text-xs font-semibold tracking-wide uppercase text-zinc-500">
                  Talk
                </p>
                <p className="text-sm text-zinc-300 mt-1">
                  Talk to the live receptionist demo in the corner, just like a real customer would on the phone.
                </p>
              </div>
              <div className="space-y-3 text-sm text-zinc-400">
                <p>
                  Click the round widget labeled “Sarah” in the bottom corner. Say what a real caller would say — ask about availability, pricing, or urgent help.
                </p>
                <p>
                  Every answer is generated live, using the same call logic that will protect your revenue when you switch it on for your own number.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href="#"
                  className="bg-white text-black font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-zinc-100 transition-colors"
                >
                  Open Sarah in the corner
                </a>
                <p className="text-[11px] text-zinc-500">
                  No install, no account required to try the demo.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <p className="text-sm text-zinc-400">
              Ready to make this your phone line?
            </p>
            <a
              href="/activate"
              className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-zinc-100 transition-colors"
            >
              Start free →
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}

