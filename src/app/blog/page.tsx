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
