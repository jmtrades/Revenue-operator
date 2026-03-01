import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BLOG_POSTS = [
  { slug: "why-missed-calls-cost-more", title: "Why missed calls cost more than you think", excerpt: "Every unanswered call is a potential customer walking to a competitor. This piece breaks down the real cost of missed calls and how to fix it.", date: "March 2026" },
  { slug: "speed-to-lead-60-second-rule", title: "Speed-to-lead: the 60-second rule", excerpt: "Responding within 60 seconds can dramatically increase your chance of closing. Here's why speed matters and how to get there.", date: "March 2026" },
  { slug: "voice-agent-vs-receptionist-cost", title: "Voice agent vs receptionist: the real cost comparison", excerpt: "How the cost of a 24/7 voice agent stacks up against hiring and retaining a human receptionist.", date: "March 2026" },
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
