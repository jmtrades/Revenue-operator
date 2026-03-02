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
  { title: string; subtitle: string; painPoints: string[]; howWeHelp: string[]; cta: string; detail?: string[] }
> = {
  "home-services": {
    title: "Home Services",
    subtitle: "Answer every call from the jobsite. Capture every lead. Book every job.",
    painPoints: ["Missed calls mean lost jobs.", "Scheduling back-and-forth wastes time.", "After-hours leads go cold."],
    howWeHelp: ["24/7 answering with your business voice.", "Instant lead capture and booking.", "Same-day follow-up so leads don’t go cold."],
    cta: "Get your phone system",
    detail: [
      "Plumbers, electricians, HVAC technicians, and other home service pros are often on the job when the phone rings. Missed calls mean lost jobs. Recall Touch answers every call in your business name, 24/7, gathers service details and address, and can book the job while the customer is on the line. You get an instant summary and the appointment on your calendar.",
    ],
  },
  healthcare: {
    title: "Healthcare",
    subtitle: "Schedule patients, handle intake, send reminders. Compliant and reliable.",
    painPoints: ["Front desk can’t keep up.", "No-shows cost time and revenue.", "After-hours calls go to voicemail."],
    howWeHelp: ["Answer and schedule 24/7.", "Automated reminders to reduce no-shows.", "HIPAA-ready options for sensitive calls."],
    cta: "Start free — 5 minutes",
    detail: [
      "Medical and dental practices run on appointments. When the front desk is overwhelmed or the office is closed, calls go to voicemail and patients book elsewhere. Recall Touch gives healthcare providers an AI front desk that never misses a call. Patients can schedule, reschedule, or get answers 24/7. Automated reminders reduce no-shows. HIPAA-compliant options are available so patient communications stay secure.",
    ],
  },
  legal: {
    title: "Legal",
    subtitle: "Professional intake, 24/7 availability. Every call documented.",
    painPoints: ["Missed calls mean lost clients.", "Intake is manual and slow.", "After-hours leads choose another firm."],
    howWeHelp: ["Never miss a potential client call.", "Structured intake and follow-up.", "Full recording and transcription for compliance."],
    cta: "Get started free",
    detail: [
      "When someone needs a lawyer, they often call several firms. The one that answers first and takes them seriously gets the case. After-hours and weekend calls frequently go to voicemail; by Monday, the lead has already retained someone else. Even during business hours, intake can be slow: manual note-taking, callbacks, and back-and-forth delay the first meeting.",
      "Recall Touch ensures every call is answered in your firm's name. The AI conducts professional intake, captures key details, and can schedule consultations. Every call is recorded and transcribed, giving you a clear record for compliance and case assessment. After-hours leads get the same prompt, professional response — so when they're ready to hire, your firm is top of mind.",
    ],
  },
  "real-estate": {
    title: "Real Estate",
    subtitle: "Qualify buyers instantly. Schedule showings. Never lose a listing lead.",
    painPoints: ["Leads call after hours and get voicemail.", "Slowness to respond loses deals.", "Showings and follow-ups are manual."],
    howWeHelp: ["Instant response, 24/7.", "Qualify and schedule showings in one call.", "Automatic follow-up and reminders."],
    cta: "Start free",
    detail: [
      "Buyers and sellers often reach out in the evening or on weekends. If they get voicemail, they move on to the next agent. Speed to lead is critical in real estate: the first responsive agent often wins the listing or the buyer. Even when you do connect, scheduling showings and follow-ups can eat up hours of back-and-forth.",
      "Recall Touch answers every call and web lead in your name, 24/7. The AI qualifies the caller, captures their needs, and can schedule showings or list a property inquiry. You get instant alerts with the full context. Follow-up reminders keep leads warm until you close. Never lose a listing or a buyer because the phone went to voicemail.",
    ],
  },
  insurance: {
    title: "Insurance",
    subtitle: "Quote intake, policy questions, renewal reminders. Claims routing when it matters.",
    painPoints: ["Peak call volume overwhelms staff.", "Renewals and quotes slip.", "After-hours emergencies need handling."],
    howWeHelp: ["Handle volume without adding staff.", "Capture quotes and send reminders.", "Route time-sensitive calls and keep records."],
    cta: "Try Recall Touch free",
    detail: [
      "Insurance agencies face spikes in call volume — after a storm, at renewal time, or when a big promotion runs. Staff can't always keep up, and hold times or missed calls mean lost quotes and frustrated clients. After-hours emergencies need handling too; policyholders expect someone to be there when it matters.",
      "Recall Touch scales with your volume. The AI handles quote intake, answers common policy questions, and captures details for follow-up. Renewal and payment reminders go out automatically. When a call is urgent, the system can escalate and notify you immediately. Every call is recorded and summarized for compliance and training.",
    ],
  },
  "b2b-sales": {
    title: "B2B Sales",
    subtitle: "Follow up on every lead in seconds. Qualify, book demos, track everything.",
    painPoints: ["Speed-to-lead is too slow.", "Many leads never get a callback.", "Manual follow-up doesn't keep up with volume."],
    howWeHelp: ["Call back new leads in under a minute.", "Qualify and book demos by voice.", "Every touch recorded and summarized."],
    cta: "Start free",
    detail: [
      "In B2B sales, speed to lead is everything. Studies show that contacting a new lead within five minutes dramatically increases conversion; after an hour, many have already moved on. But SDRs can't always drop everything to call the moment a form lands. Volume outstrips capacity, and leads slip through the cracks.",
      "Recall Touch can call new leads back in under a minute. The AI introduces your company, qualifies interest, and can book a demo or hand off to a rep with full context. Every conversation is summarized and logged so your team has full visibility. You never miss a lead because no one had time to pick up the phone.",
    ],
  },
  "local-business": {
    title: "Local Business",
    subtitle: "Salons, restaurants, auto shops. Answer while you serve. Book while you work.",
    painPoints: ["You’re with a customer when the phone rings.", "Booking is back-and-forth.", "After-hours calls are lost."],
    howWeHelp: ["Every call answered, even at peak times.", "Book appointments in one conversation.", "24/7 availability without extra staff."],
    cta: "Get started free",
    detail: [
      "Salons, restaurants, auto shops, and other local businesses are hands-on. When you're with a customer, the phone rings — and either you ignore it and lose the call, or you step away and disrupt the experience. Recall Touch answers every call, even during your busiest times. The AI takes reservations, books appointments, and captures messages. You get a quick summary and the appointment on your calendar.",
    ],
  },
  contractors: {
    title: "Contractors",
    subtitle: "Roofing, painting, landscaping. Every estimate captured. Every job booked.",
    painPoints: ["You’re on a roof when the phone rings.", "Estimates and scheduling are manual.", "Missed calls go to the competition."],
    howWeHelp: ["Answer every call, from anywhere.", "Capture details and book estimates.", "Follow up automatically so jobs don’t slip."],
    cta: "Start free — 5 minutes",
    detail: [
      "Roofers, painters, landscapers, and other contractors are usually on-site when the phone rings. Missing a call means missing a job. Recall Touch answers every call in your company's name, 24/7. The AI captures the project details, address, and contact info, and can schedule estimate appointments. You get an instant alert with everything you need. Stop losing work because you were on a ladder when the phone rang.",
    ],
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
          <div className="grid md:grid-cols-2 gap-12 mb-10">
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
          {meta.detail && (
            <div className="mb-16 space-y-4" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {meta.detail.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
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
