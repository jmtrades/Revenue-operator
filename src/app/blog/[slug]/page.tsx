import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BLOG_POSTS: Record<
  string,
  { title: string; date: string; body: string }
> = {
  "how-ai-phone-agents-work": {
    title: "How AI phone agents work (and why they don't sound like robots)",
    date: "February 2026",
    body: `Modern voice AI sounds natural and handles real conversations. Here's how it works and why callers often can't tell the difference.

AI phone agents use neural text-to-speech and speech recognition that have improved dramatically in the last few years. When someone calls, the system turns their speech into text, runs it through a language model trained to stay on script and capture the right details, then turns the reply back into speech. The result is a conversation that feels like talking to a person — short, natural, and focused on the outcome.

The key is constraint. A good AI agent isn't trying to chat; it's trying to answer the question, book the appointment, or capture the callback. That narrow focus makes the conversation predictable and professional. Callers get what they need without long holds or voicemail. Businesses get every call answered, 24/7, with a record of what was said and what was promised.

Recall Touch is built around this model: natural voice in, structured outcome out. You set the script, the hours, and the rules. The agent handles the rest. No robots, no awkward pauses — just a consistent first touch so you never miss a lead.`,
  },
  "5-signs-losing-revenue-missed-calls": {
    title: "5 signs you're losing revenue to missed calls",
    date: "February 2026",
    body: `If you're missing calls, you're missing revenue. Learn the warning signs and what to do about them.

First: your voicemail is full of "I called but nobody answered" messages. That means people tried, gave up, or left a message you might not return in time. Second: you see spikes in web form submissions right after business hours. People are looking for you when the phone doesn't get picked up. Third: your team says they're too busy to answer. When everyone is on a job or with a client, the phone rings out. Fourth: you've lost a deal or two because "we called someone else who answered." Speed and availability matter. Fifth: you don't know how many calls you're missing. If you aren't measuring answer rate, you're flying blind.

The fix isn't always hiring. A 24/7 AI phone agent can answer every call, take messages, book appointments, and follow up — so your team can focus on the work that needs a human. Recall Touch gives you a single number that never goes to voicemail and never leaves a caller waiting. Once you see the difference in answer rate and lead conversion, missed calls stop being the norm.`,
  },
  "recall-touch-vs-hiring": {
    title: "Recall Touch vs hiring: the real cost comparison",
    date: "March 2026",
    body: `How the cost of a 24/7 AI phone agent stacks up against hiring and retaining a human receptionist or SDR.

A full-time receptionist or SDR often costs $35,000–$55,000 a year when you include salary, benefits, training, and turnover. One person can answer one call at a time. They get sick, take vacation, and leave for other jobs. They can't work at 2 AM or handle ten calls at once. An AI phone system answers every call, 24/7, and scales with your volume. Monthly cost is a fraction of one hire — often in the low hundreds per month.

The best setup is usually both: the AI handles first contact, after-hours, and overflow. Your team steps in for complex conversations and in-person work. You get higher answer rates, faster follow-up, and a clear record of every call. Recall Touch is built for that hybrid model. You keep control of the script and the rules; the system handles execution. When you compare total cost and coverage, the math favors the AI layer for most small and mid-size teams.`,
  },
  "setup-guide-5-minutes": {
    title: "Setup guide: Go live in 5 minutes",
    date: "March 2026",
    body: `Get your AI phone agent answering calls in under 5 minutes. Step-by-step with no technical setup required.

Step one: sign up and add your business name and phone number. Step two: pick a template that matches how you want to sound — professional, friendly, efficient, or custom. Step three: record or choose a greeting and add your hours. The agent will answer during those times and take messages or route after hours. Step four: connect your calendar if you want the agent to book appointments. Step five: forward your existing number to your Recall Touch number, or get a new number and start giving it out. That's it. Your agent is live.

You can change the script, hours, and settings anytime. No code, no long implementation. Recall Touch is designed so that the person who answers the phone can set it up. If you've ever missed a call because you were with a client or after hours, five minutes is all it takes to make sure the next one gets answered.`,
  },
  "why-missed-calls-cost-more": {
    title: "Why missed calls cost more than you think",
    date: "March 2026",
    body: `Every unanswered call is a potential customer walking to a competitor. Studies show that the majority of callers who don't reach someone on the first try will try another business. The cost isn't just the one sale — it's the lifetime value of that customer and everyone they might have referred. Fixing your answer rate is one of the highest-leverage moves a small business can make.

Research from multiple industries backs this up. In home services, a single missed call can represent hundreds or thousands of dollars in lost work. The same pattern appears in healthcare, legal, and real estate. Delay or silence means the lead goes elsewhere. Industry benchmarks suggest that many small businesses miss between 20% and 40% of incoming calls. Voicemail isn't a solution; a large share of callers hang up. AI phone systems can answer every call in your business's name. Recall Touch is built for exactly that: making sure the next time a customer is ready to buy or book, you're the one who answers.`,
  },
  "speed-to-lead-60-second-rule": {
    title: "Speed-to-lead: the 60-second rule",
    date: "March 2026",
    body: `Responding within 60 seconds can dramatically increase your chance of closing. Here's why speed matters and how to get there.

When someone is ready to buy or book, they're comparing options. The first business to respond often gets the commitment. Leads contacted within five minutes are far more likely to convert than those contacted an hour later. The first response feels like attention and reliability; delay feels like indifference. The challenge for most small businesses is that they're not built for 60-second response. You're with a client, in a meeting, or off the clock.

Recall Touch closes that gap. When a new lead comes in — from your website, a form, or a missed call — the system can call or text them back in under a minute. It gathers key details, books an appointment, or qualifies the lead so your team knows exactly who to follow up with. You get speed without dropping everything. The 60-second rule isn't a nice-to-have; it's a direct driver of revenue. With the right system, it's also achievable.`,
  },
  "after-hours-lead-capture": {
    title: "After-hours lead capture: stop losing calls after 5 PM",
    date: "April 2026",
    body: `After-hours calls are still revenue. The only difference is your team isn't available to answer them.

Most businesses lose leads after hours in three common ways. Calls go to voicemail and callers never get a clear next step. Or the team checks messages the next morning, by which point the lead has already picked a competitor. Or nobody follows up with the details that matter: the caller's name, the purpose of the call, and the best time to reach them.

An AI phone agent fixes this by turning every after-hours attempt into a structured outcome. It answers the call, asks the minimum questions needed to qualify the lead, captures the phone number and intent, and then triggers the next step: a callback, an SMS follow-up, or an appointment booking. Your business stays responsive even when your hours say otherwise.

Recall Touch makes after-hours lead capture consistent. You control the script, the hours, and the booking rules. The agent handles the execution, so missed revenue becomes booked revenue.`,
  },
  "voicemail-to-appointment": {
    title: "Turn voicemail into appointments (without hiring)",
    date: "April 2026",
    body: `Voicemail isn't a dead end. It's raw signal — and most teams waste it.

When a caller leaves a message, the opportunity is already there: they raised their hand and asked for help. The problem is that the message usually arrives too late, and it often lacks the structured details your team needs to act quickly. Searching inboxes, summarizing what the caller said, and manually calling back is slow work.

With Recall Touch, voicemail becomes an intake pipeline. The system transcribes the message, extracts intent, and asks follow-up questions only when necessary. Then it routes the caller toward the right outcome: callback scheduling, booking an appointment, or capturing the information needed to engage later. Instead of letting a voicemail disappear into a backlog, you turn it into a next action.

The result is simple: fewer “we'll get back to you” promises and more booked times. You stop hiring for every new spike in call volume, while your appointment pipeline stays full.`,
  },
  "missed-call-metrics-revenue": {
    title: "Missed call metrics that actually predict revenue",
    date: "April 2026",
    body: `Most teams measure vanity metrics. They report call volume, voicemail counts, or how many agents were online.

Those numbers don't directly predict revenue. What does predict bookings is how quickly you respond and how consistently you move leads to the next step.

Start with three measurements:

1) Pickup rate (answer rate). It tells you how many opportunities you convert from “calling” into “talking.”
2) Time-to-first-response. Speed-to-lead is real. If you wait hours, you lose the highest-intent callers first.
3) Callback-to-booking conversion. Not every callback should become an appointment, but a high-quality follow-up flow will convert a measurable portion.

Then connect those metrics to outcomes. If answer rate improves but booking conversion doesn't, your script and qualification rules need adjustment. If booking conversion improves but missed calls stay high, your hours and routing need expansion.

Recall Touch gives you the dashboard signals to measure what matters, so you can fix the right bottleneck instead of guessing.`,
  },
  "follow-up-speed-automation": {
    title: "Follow-up automation: how to book in minutes, not days",
    date: "April 2026",
    body: `Fast follow-up isn't about being “pushy.” It's about being the first business that actually moves.

When someone reaches out, there is usually a window of intent. After that window closes, your lead doesn't disappear — but the likelihood of booking drops. Small businesses often lose this window because follow-up is manual, scattered across inboxes and message apps, and vulnerable to human scheduling.

A follow-up system should do three things:

First, immediately capture the details that a human needs to act (name, phone, intent, and the preferred time).
Second, trigger a callback or SMS follow-up in minutes, not hours.
Third, book when the lead is ready, and otherwise keep the conversation governed with a consistent next step.

Recall Touch follows up with automation that stays tied to real call outcomes. You can configure the script, set the speed-to-lead behavior, and ensure that every follow-up results in a measurable next action — not an unanswered thread.

When your follow-ups run on a schedule instead of a checklist, appointments stop being luck and become process.`,
  },
};

export function generateStaticParams() {
  return Object.keys(BLOG_POSTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS[slug];
  if (!post) return { title: "Blog" };
  const description = post.body.slice(0, 160).replace(/\s+/g, " ").trim() + "...";
  return {
    title: post.title,
    description,
    openGraph: { title: post.title, description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS[slug];
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
