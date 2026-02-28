"use client";

import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em" }}>
              Get in touch
            </h1>
            <p className="text-lg mb-12" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              Whether you&apos;re evaluating Recall Touch for your team or need technical support, we&apos;re here.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-16">
              <div className="card-marketing p-8 flex flex-col">
                <h2 className="font-semibold text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                  Sales & Enterprise
                </h2>
                <p className="text-sm mb-6 flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Talk to our team about Team plans, custom compliance, and volume pricing.
                </p>
                <a href="mailto:enterprise@recall-touch.com?subject=Enterprise%20inquiry" className="btn-marketing-primary w-full block text-center py-3 rounded-lg no-underline">
                  Book a call →
                </a>
                <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
                  enterprise@recall-touch.com
                </p>
              </div>
              <div className="card-marketing p-8 flex flex-col">
                <h2 className="font-semibold text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                  Support
                </h2>
                <p className="text-sm mb-6 flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Need help with your account, technical issues, or billing?
                </p>
                <a href="mailto:support@recall-touch.com" className="btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline">
                  Email support →
                </a>
                <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
                  support@recall-touch.com
                </p>
              </div>
            </div>

            <div className="border rounded-lg p-8" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              <h2 className="font-semibold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                Send a message
              </h2>
              <form action="mailto:hello@recall-touch.com" method="get" encType="text/plain" className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Name</label>
                  <input id="name" name="name" type="text" required className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]" style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                  <input id="email" name="email" type="email" required className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]" style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label htmlFor="body" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Message</label>
                  <textarea id="body" name="body" rows={4} required className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] resize-y" style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }} />
                </div>
                <button type="submit" className="btn-marketing-primary px-6 py-2.5 rounded-lg text-sm">
                  Send
                </button>
              </form>
            </div>

            <p className="text-sm mt-8" style={{ color: "var(--text-tertiary)" }}>
              <Link href={ROUTES.START} className="underline hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>Start free →</Link>
              {" · "}
              <Link href="/" className="underline hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>Back to home</Link>
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
