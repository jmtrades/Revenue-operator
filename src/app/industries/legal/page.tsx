import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.revenueoperator.ai";

export const metadata = {
  title: "Legal Practice AI Revenue Operations — Revenue Operator",
  description:
    "Maximize intake conversion and consultation booking with complete AI-powered workflows: instant call answering, case intake, urgency screening, consultation scheduling, follow-up automation, and lead qualification.",
  alternates: { canonical: `${BASE}/industries/legal` },
};

export default function LegalIndustryPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
      { "@type": "ListItem", position: 3, name: "Legal", item: `${BASE}/industries/legal` },
    ],
  };

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Legal Practice AI Revenue Operations",
    url: `${BASE}/industries/legal`,
    description:
      "Complete AI revenue operations for legal: intake answering, case qualification and urgency screening, consultation scheduling, follow-up automation, intake prioritization, and pipeline acceleration.",
    address: { "@type": "PostalAddress", addressCountry: "US" },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <Navbar />
      <main className="pt-28 pb-20">
        <Container>
          <div className="max-w-3xl mx-auto">
            <p className="section-label mb-4" style={{ color: "var(--accent-primary)" }}>
              Legal & professional services
            </p>
            <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Capture every intake. Book consultations faster. Convert more leads automatically.
            </h1>
            <p className="text-base md:text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              In legal, the cost of an unanswered call can be enormous. Potential clients often call multiple firms in a row, and
              the firm that answers first usually wins. The problem is simple: your team is busy. Attorneys are in meetings.
              Staff is juggling documents, court deadlines, and existing clients. If a new matter goes to voicemail, the client
              moves on. Revenue Operator prevents that by answering 24/7, collecting a structured intake, and booking a consultation
              (or escalating urgent matters) with consistent follow-up.
            </p>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 md:p-8 mb-8">
              <h2 className="text-lg font-semibold mb-3">Why legal lead capture breaks</h2>
              <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                <p>
                  Legal callers rarely "shop around" for weeks. They call when something happened: a crash, an arrest, a dispute,
                  a deadline. That urgency creates high conversion potential—but it also means the first responsive firm wins.
                  If your intake process depends on callbacks, you’re choosing a slower lane.
                </p>
                <p>
                  The second failure mode is inconsistent qualification. A rushed call might miss critical details: jurisdiction,
                  timeline, opposing party, injury severity, prior counsel, or budget expectations. Without structure, you either
                  waste time on unqualified consultations or miss qualified cases because the follow-up isn’t prioritized.
                </p>
                <p>
                  Third, follow-up decays. If someone doesn’t answer the first callback, most firms try once or twice and give up.
                  The opportunity doesn’t disappear; it just goes to the firm that follows through.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">How Revenue Operator runs legal intake</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Revenue Operator answers with a calm, professional intake script aligned to your practice area. It asks the right
                questions, collects contact details, and captures the case summary in a structured format your team can act on.
                You decide escalation rules: emergencies, time-sensitive matters, high-value leads, or specific keywords can
                route to a person immediately—while routine intake is handled automatically.
              </p>
              <p>
                For consultations, Revenue Operator can book directly against your availability or propose times and let your staff
                confirm. Either way, the system drives to a concrete next step: a scheduled consult, a document request, or a
                respectful decline with proper notes.
              </p>
              <p>
                After intake, Revenue Operator follows up. If the prospect doesn’t respond, it sends a short message with a clear
                CTA. If they reply with questions, it answers using your policies and language, then continues the scheduling flow.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 my-10">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Use cases (examples)</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Personal injury intake: incident details, parties, injuries, medical treatment</li>
                  <li>Family law: urgency signals, jurisdiction, consultation booking</li>
                  <li>Criminal defense: time-sensitive escalation, intake, immediate callbacks</li>
                  <li>Immigration: eligibility screening + document checklist follow-up</li>
                  <li>General practice: routing by matter type and priority</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
                <h3 className="text-sm font-semibold mb-2">Control and accountability</h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <li>Transcript + recording visibility for every call</li>
                  <li>Approval gates for outbound follow-up if you require it</li>
                  <li>Per-contact limits + quiet hours to avoid aggressive outreach</li>
                  <li>Opt-out handling and compliance guardrails</li>
                  <li>Audit-ready activity trail for intake actions</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">ROI (why speed-to-lead matters most here)</h2>
            <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <p>
                Legal ROI isn’t driven by "more calls"—it’s driven by conversion velocity. If answering faster converts one
                additional qualified case per quarter, the system pays for itself many times over. Even in lower-value matters,
                consistent intake and follow-up means fewer dropped consultations and fewer empty calendar blocks.
              </p>
              <p>
                Revenue Operator is designed for measured professionalism: it doesn’t "spam." It follows your rules. It documents
                every interaction. And it helps your team spend time where it matters—qualified matters that are ready to move.
              </p>
              <p>
                The practical outcome: you stop relying on heroic front-desk performance during peak hours. Your firm becomes
                reliably responsive, even when everyone is busy.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link href={ROUTES.START} className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                Get started →
              </Link>
              <Link href="/demo" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                Watch the demo →
              </Link>
              <Link href={ROUTES.PRICING} className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                View pricing →
              </Link>
            </div>

            <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
              See also{" "}
              <Link href="/industries/dental" className="underline">dental</Link>{" "}
              and{" "}
              <Link href="/industries/hvac" className="underline">HVAC</Link>.
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

