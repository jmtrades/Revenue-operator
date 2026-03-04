import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function Hero() {
  return (
    <section
      className="pt-28 pb-16 md:pt-32 md:pb-20 relative overflow-hidden"
      style={{ background: "#0F1729" }}
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
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] items-center">
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
              Your phone calls. Handled.
            </h1>
            <p
              className="text-base md:text-lg max-w-lg mb-6"
              style={{ color: "#94A3B8", lineHeight: 1.7 }}
            >
              AI that handles your calls, texts, follow-ups, and scheduling — so you can focus on everything else. For businesses, teams, and anyone who communicates by phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-3">
              <Link
                href={ROUTES.START}
                className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center"
              >
                Try it free →
              </Link>
              <a
                href="#live-audio-demo"
                className="border border-white/30 text-white font-semibold rounded-xl px-5 py-2.5 hover:bg-white/10 transition-colors no-underline w-full sm:w-auto text-center inline-flex items-center justify-center gap-2"
              >
                Watch it work ▶
              </a>
            </div>
            <p
              className="text-sm mb-6"
              style={{ color: "#64748B" }}
            >
              ✓ Works with your existing number &nbsp; ✓ 5-minute setup &nbsp; ✓ No credit card required
            </p>
            <p className="text-xs font-medium" style={{ color: "#64748B" }}>
              Trusted by 200+ businesses, solo operators, and teams
            </p>
          </div>
          <div
            className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-5 md:px-6 md:py-6 shadow-[0_24px_80px_rgba(15,23,42,0.8)] hidden lg:block"
            aria-hidden="true"
          >
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: "#64748B" }}>Every call answered</p>
            <p className="text-sm" style={{ color: "#E5E7EB" }}>Answer · Follow up · Book · Never miss a beat.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
