import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const INDUSTRY_SLUGS = [
  "home-services",
  "healthcare",
  "legal",
  "real-estate",
  "insurance",
  "b2b-sales",
  "local-business",
  "contractors",
] as const;

const INDUSTRY_META: Record<
  string,
  { title: string; subtitle: string; painPoints: string[]; howWeHelp: string[]; cta: string }
> = {
  "home-services": {
    title: "Home Services",
    subtitle: "Answer every call from the jobsite. Capture every lead. Book every job.",
    painPoints: ["Missed calls mean lost jobs.", "Scheduling back-and-forth wastes time.", "After-hours leads go cold."],
    howWeHelp: ["24/7 answering with your business voice.", "Instant lead capture and booking.", "Same-day follow-up so leads don’t go cold."],
    cta: "Get your phone system",
  },
  healthcare: {
    title: "Healthcare",
    subtitle: "Schedule patients, handle intake, send reminders. Compliant and reliable.",
    painPoints: ["Front desk can’t keep up.", "No-shows cost time and revenue.", "After-hours calls go to voicemail."],
    howWeHelp: ["Answer and schedule 24/7.", "Automated reminders to reduce no-shows.", "HIPAA-ready options for sensitive calls."],
    cta: "Start free — 5 minutes",
  },
  legal: {
    title: "Legal",
    subtitle: "Professional intake, 24/7 availability. Every call documented.",
    painPoints: ["Missed calls mean lost clients.", "Intake is manual and slow.", "After-hours leads choose another firm."],
    howWeHelp: ["Never miss a potential client call.", "Structured intake and follow-up.", "Full recording and transcription for compliance."],
    cta: "Get started free",
  },
  "real-estate": {
    title: "Real Estate",
    subtitle: "Qualify buyers instantly. Schedule showings. Never lose a listing lead.",
    painPoints: ["Leads call after hours and get voicemail.", "Slowness to respond loses deals.", "Showings and follow-ups are manual."],
    howWeHelp: ["Instant response, 24/7.", "Qualify and schedule showings in one call.", "Automatic follow-up and reminders."],
    cta: "Start free",
  },
  insurance: {
    title: "Insurance",
    subtitle: "Quote intake, policy questions, renewal reminders. Claims routing when it matters.",
    painPoints: ["Peak call volume overwhelms staff.", "Renewals and quotes slip.", "After-hours emergencies need handling."],
    howWeHelp: ["Handle volume without adding staff.", "Capture quotes and send reminders.", "Route time-sensitive calls and keep records."],
    cta: "Try Recall Touch free",
  },
  "b2b-sales": {
    title: "B2B Sales",
    subtitle: "Follow up on every lead in seconds. Qualify, book demos, track everything.",
    painPoints: ["Speed-to-lead is too slow.", "Many leads never get a callback.", "Manual follow-up doesn't keep up with volume."],
    howWeHelp: ["Call back new leads in under a minute.", "Qualify and book demos by voice.", "Every touch recorded and summarized."],
    cta: "Start free",
  },
  "local-business": {
    title: "Local Business",
    subtitle: "Salons, restaurants, auto shops. Answer while you serve. Book while you work.",
    painPoints: ["You’re with a customer when the phone rings.", "Booking is back-and-forth.", "After-hours calls are lost."],
    howWeHelp: ["Every call answered, even at peak times.", "Book appointments in one conversation.", "24/7 availability without extra staff."],
    cta: "Get started free",
  },
  contractors: {
    title: "Contractors",
    subtitle: "Roofing, painting, landscaping. Every estimate captured. Every job booked.",
    painPoints: ["You’re on a roof when the phone rings.", "Estimates and scheduling are manual.", "Missed calls go to the competition."],
    howWeHelp: ["Answer every call, from anywhere.", "Capture details and book estimates.", "Follow up automatically so jobs don’t slip."],
    cta: "Start free — 5 minutes",
  },
};

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export default function IndustryPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const meta = INDUSTRY_META[slug];
  if (!meta) notFound();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="max-w-2xl mb-12">
            <p className="section-label mb-2">Industry</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {meta.title}
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {meta.subtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="font-semibold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Common challenges</h2>
              <ul className="space-y-2 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                {meta.painPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-4" style={{ color: "var(--text-primary)" }}>How Recall Touch helps</h2>
              <ul className="space-y-2 list-disc pl-5" style={{ color: "var(--text-secondary)" }}>
                {meta.howWeHelp.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-block">
              {meta.cta} →
            </Link>
            <Link href={ROUTES.DEMO} className="btn-marketing-ghost no-underline inline-block">
              Hear a demo
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
