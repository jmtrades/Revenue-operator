import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { ContactForm } from "@/components/ContactForm";

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
              Whether you&apos;re evaluating Recall Touch for your team or need technical support, the team is here to help. Email hello@recall-touch.com — response within 4 hours.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-16">
              <div className="card-marketing p-8 flex flex-col">
                <h2 className="font-semibold text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                  Sales & Enterprise
                </h2>
                <p className="text-sm mb-6 flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Talk to the team about Team plans, custom compliance, and volume pricing.
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
              <ContactForm />
              <p className="text-sm mt-4" style={{ color: "var(--text-tertiary)" }}>
                hello@recall-touch.com · <a href="mailto:hello@recall-touch.com?subject=Schedule%20a%20call" className="underline" style={{ color: "var(--accent-primary)" }}>Schedule a call →</a>
              </p>
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
