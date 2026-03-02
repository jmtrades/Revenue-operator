import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BLOG_POSTS: Record<
  string,
  { title: string; date: string; body: string }
> = {
  "why-missed-calls-cost-more": {
    title: "Why missed calls cost more than you think",
    date: "March 2026",
    body: `Every unanswered call is a potential customer walking to a competitor. Studies show that the majority of callers who don't reach someone on the first try will try another business. The cost isn't just the one sale — it's the lifetime value of that customer and everyone they might have referred. Fixing your answer rate is one of the highest-leverage moves a small business can make.

Research from multiple industries backs this up. In home services, a single missed call can represent hundreds or thousands of dollars in lost work. The same pattern appears in healthcare, legal, and real estate. Delay or silence means the lead goes elsewhere. Industry benchmarks suggest that many small businesses miss between 20% and 40% of incoming calls. Voicemail isn't a solution; a large share of callers hang up. AI phone systems can answer every call in your business's name. Recall Touch is built for exactly that: making sure the next time a customer is ready to buy or book, you're the one who answers.`,
  },
  "speed-to-lead-60-second-rule": {
    title: "Speed-to-lead: the 60-second rule",
    date: "March 2026",
    body: `Responding to a new lead within 60 seconds can dramatically increase your chance of closing. When someone is ready to buy or book, they\'re comparing options. The first business to respond often gets the commitment. Speed-to-lead isn\'t just a nice-to-have — it\'s a direct driver of revenue.

Leads contacted within five minutes are far more likely to convert than those contacted even an hour later. The first response feels like attention and reliability; delay feels like indifference. The challenge for most small businesses is that they\'re not built for 60-second response. Recall Touch can call leads back in under a minute and gather key details or book an appointment. The system handles the first touch at speed; you step in when it matters most.`,
  },
  "voice-agent-vs-receptionist-cost": {
    title: "Voice agent vs receptionist: the real cost comparison",
    date: "March 2026",
    body: `A 24/7 voice agent that answers in your business\'s voice, captures leads, and books appointments costs a fraction of a full-time receptionist. When you add hiring, training, benefits, and the fact that humans can\'t be everywhere at once, the math shifts.

A full-time receptionist often costs $40,000–$55,000 all-in. One person can only answer one call at a time. A voice AI system answers every call, 24/7, and can handle multiple calls at once. Monthly costs for Recall Touch start in the double digits per month. If the system captures even a handful of jobs or appointments per year that would otherwise have been missed, it has paid for itself many times over. The best setup is often a combination: the AI handles first contact while your team focuses on in-person service.`,
  },
};

export function generateStaticParams() {
  return Object.keys(BLOG_POSTS).map((slug) => ({ slug }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS[params.slug];
  if (!post) notFound();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="max-w-2xl">
            <Link href="/blog" className="text-sm font-medium mb-6 inline-block" style={{ color: "var(--text-tertiary)" }}>
              ← Blog
            </Link>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>{post.date}</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-6" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {post.title}
            </h1>
            <div className="prose prose-invert max-w-none" style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>
              {post.body.split(/\n\n+/).map((para, i) => (
                <p key={i} className="mb-4">{para}</p>
              ))}
            </div>
            <div className="mt-12 pt-8 border-t flex gap-4" style={{ borderColor: "var(--border-default)" }}>
              <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-block">
                Start free →
              </Link>
              <Link href="/blog" className="btn-marketing-ghost no-underline inline-block">
                Back to blog
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
