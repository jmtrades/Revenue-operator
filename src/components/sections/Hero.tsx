import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { HomepageVoiceWidget } from "@/components/demo/HomepageVoiceWidget";

export function Hero() {
  return (
    <section
      className="min-h-screen flex items-center pt-28 pb-16 md:pt-32 md:pb-20 relative overflow-hidden bg-[var(--bg-base)]"
    >
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 450px at 0% 0%, rgba(59,130,246,0.15), transparent 60%), radial-gradient(ellipse 700px 400px at 100% 10%, rgba(16,185,129,0.1), transparent 60%)",
          opacity: 0.9,
        }}
      />
      <Container className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy + CTA */}
          <div>
            <SectionLabel>AI phone intelligence</SectionLabel>
            <h1
              className="font-bold max-w-xl mt-4 mb-4"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.5rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "#F8FAFC",
              }}
            >
              Your phone calls.
              <br />
              Handled.
            </h1>
            <p
              className="text-base md:text-lg max-w-lg mb-4"
              style={{ color: "#94A3B8", lineHeight: 1.7 }}
            >
              Never miss a call. Never lose a lead. Every caller gets a real conversation, even when you can&apos;t pick up.
            </p>
            <p className="text-sm text-white/50 mb-6">
              Used by 500+ businesses · 10,000+ calls handled
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
              <Link
                href={ROUTES.START}
                className="bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center"
              >
                Start free →
              </Link>
              <Link
                href={ROUTES.SIGN_IN}
                className="border border-white/20 text-white/90 font-medium rounded-xl px-5 py-2.5 hover:bg-white/10 transition-colors no-underline w-full sm:w-auto text-center"
              >
                Sign in
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: "#64748B" }}>
              <span>✓ Works with your existing number</span>
              <span>✓ 5-minute setup</span>
              <span>✓ No credit card required</span>
            </div>
          </div>

          {/* Right: speak to agent */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 max-w-md lg:ml-auto">
            <HomepageVoiceWidget />
          </div>
        </div>
      </Container>
    </section>
  );
}
