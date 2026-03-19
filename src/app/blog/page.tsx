import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BLOG_POSTS = [
  { slug: "how-ai-phone-agents-work", title: "How AI phone agents work (and why they don't sound like robots)", excerpt: "Modern voice AI sounds natural and handles real conversations. Here's how it works and why callers often can't tell the difference.", date: "February 2026" },
  { slug: "5-signs-losing-revenue-missed-calls", title: "5 signs you're losing revenue to missed calls", excerpt: "If you're missing calls, you're missing revenue. Learn the warning signs and what to do about them.", date: "February 2026" },
  { slug: "recall-touch-vs-hiring", title: "Recall Touch vs hiring: the real cost comparison", excerpt: "How the cost of a 24/7 AI phone agent stacks up against hiring and retaining a human receptionist or SDR.", date: "March 2026" },
  { slug: "setup-guide-5-minutes", title: "Setup guide: Go live in 5 minutes", excerpt: "Get your AI phone agent answering calls in under 5 minutes. Step-by-step with no technical setup required.", date: "March 2026" },
  { slug: "why-missed-calls-cost-more", title: "Why missed calls cost more than you think", excerpt: "Every unanswered call is a potential customer walking to a competitor. This piece breaks down the real cost of missed calls and how to fix it.", date: "March 2026" },
  { slug: "speed-to-lead-60-second-rule", title: "Speed-to-lead: the 60-second rule", excerpt: "Responding within 60 seconds can dramatically increase your chance of closing. Here's why speed matters and how to get there.", date: "March 2026" },
  { slug: "after-hours-lead-capture", title: "After-hours lead capture: stop losing calls after 5 PM", excerpt: "Answer every missed call, take the right details, and book appointments even when your team is offline.", date: "April 2026" },
  { slug: "voicemail-to-appointment", title: "Turn voicemail into appointments (without hiring)", excerpt: "Voicemail transcripts are only the start. We show how to convert messages into booked times and qualified leads.", date: "April 2026" },
  { slug: "missed-call-metrics-revenue", title: "Missed call metrics that actually predict revenue", excerpt: "Track the signals that correlate with bookings: pickup rate, time-to-first-response, and conversion from callbacks.", date: "April 2026" },
  { slug: "follow-up-speed-automation", title: "Follow-up automation: how to book in minutes, not days", excerpt: "A practical blueprint for fast callback and SMS follow-ups that move leads to appointments.", date: "April 2026" },
  { slug: "agency-partner-dashboard-15-percent-share", title: "Agency partners: 15% revenue share you can actually track", excerpt: "A clear partner dashboard, measurable outcomes, and a clean handoff from partner to customer.", date: "May 2026" },
  { slug: "auto-generated-case-studies-from-revenue-recovered", title: "Auto-generated case studies from real revenue recovered", excerpt: "Turn call outcomes into a proof format you can reuse for sales, renewals, and customer storytelling.", date: "May 2026" },
  { slug: "customer-health-scoring-churn-prediction", title: "Customer health scoring: predict churn before it happens", excerpt: "A practical churn model based on outcomes, activity recency, and billing risk signals.", date: "May 2026" },
  { slug: "status-page-for-ai-phone-systems", title: "Status pages for AI phone systems: uptime and outcomes", excerpt: "Go beyond uptime. Monitor database, billing webhooks, and execution heartbeats so outages are actionable.", date: "May 2026" },
  { slug: "missed-calls-dental-revenue-loss", title: "How Missed Calls Cost Dental Revenue", excerpt: "Missed dental calls create a revenue leak. Learn the leak math and how no-show recovery protects your chair time.", date: "March 2026" },
  { slug: "ai-vs-human-receptionist-real-cost", title: "AI vs Human Receptionist: Real Cost Comparison", excerpt: "Compare AI vs human receptionist services by outcomes: speed-to-lead, booking, follow-up automation, and attribution.", date: "March 2026" },
  { slug: "what-is-ai-revenue-operations-complete-guide", title: "What Is AI Revenue Operations?", excerpt: "A complete guide to AI RevOps: answer, capture intent, execute next steps, recover missed outcomes, and measure proof.", date: "March 2026" },
  { slug: "automated-no-show-recovery-playbook", title: "Automated No-Show Recovery Playbook", excerpt: "No-show recovery is a workflow. Get the playbook for confirmations, reminders, reschedule paths, and measurable results.", date: "April 2026" },
  { slug: "speed-to-lead-response-time-revenue", title: "Speed to Lead: Response Time Revenue", excerpt: "Speed-to-lead drives bookings. Learn the metrics to measure, the workflows to execute, and why recovery needs to be fast.", date: "April 2026" },
  { slug: "hvac-companies-how-to-answer-every-call-without-hiring", title: "HVAC: Answer Every Call Without Hiring", excerpt: "HVAC calls are urgent. See how fast answering, booking, and follow-up automation protect busy seasons without extra staff.", date: "April 2026" },
  { slug: "legal-intake-automation-capture-every-potential-client", title: "Legal Intake Automation: Capture Every Client", excerpt: "Legal intake needs speed and structure. Learn how call answering, screening, and follow-up automation capture more clients.", date: "April 2026" },
  { slug: "how-to-calculate-your-missed-call-revenue-leak", title: "How to Calculate Your Missed Call Revenue Leak", excerpt: "Model missed-call revenue leakage with a practical pipeline equation, then fix it with recovery workflows and proof.", date: "May 2026" },
  { slug: "recall-touch-vs-smith-ai-which-is-right", title: "Recall Touch vs Smith.ai: Which Is Right?", excerpt: "Why follow-up engine gaps and lack of revenue attribution matter more than call answering alone. Compare the outcomes.", date: "May 2026" },
  { slug: "follow-up-playbook-why-80-percent-of-revenue-second-touch", title: "Second-Touch Revenue: The Follow-Up Playbook", excerpt: "Most revenue is in the second touch. Learn a practical playbook for speed, clarity, governance, and measurable recovery.", date: "June 2026" },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="max-w-2xl mb-12">
            <p className="section-label mb-2">Blog</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>Resources and insights</h1>
            <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>Practical guides on answering every call, following up faster, and turning calls into revenue.</p>
          </div>
          <div className="space-y-8 max-w-2xl">
            {BLOG_POSTS.map((post) => (
              <article key={post.slug} className="rounded-xl border p-6 transition-colors hover:border-[var(--accent-primary)]" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>{post.date}</p>
                <h2 className="font-semibold text-xl mb-2" style={{ color: "var(--text-primary)" }}>{post.title}</h2>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>Read more →</Link>
              </article>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
            <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-block">Start free — 5 minutes →</Link>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
