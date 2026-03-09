import { Container } from "@/components/ui/Container";
import { Phone, UserPlus, CalendarCheck } from "lucide-react";

const CARDS = [
  {
    icon: Phone,
    title: "Missed calls recovered",
    description:
      "Your AI answers 24/7 so every caller gets a real conversation, not voicemail.",
  },
  {
    icon: UserPlus,
    title: "Leads captured automatically",
    description:
      "Name, phone, and what they need — captured and routed in seconds.",
  },
  {
    icon: CalendarCheck,
    title: "Appointments booked on the spot",
    description:
      "Integrated with your calendar. No back-and-forth, no no-shows.",
  },
] as const;

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$297",
    tagline: "For solo operators and small teams getting started.",
    features: [
      "Up to 500 answered calls / month",
      "1 AI phone number",
      "Basic call summaries & lead capture",
      "Standard support",
    ],
    badge: null as "Most popular" | null,
  },
  {
    name: "Pro",
    price: "$597",
    tagline: "For growing teams that need full coverage.",
    features: [
      "Up to 2,000 answered calls / month",
      "3 AI phone numbers",
      "Advanced call intelligence & routing",
      "Priority support",
    ],
    badge: "Most popular" as const,
  },
  {
    name: "Business",
    price: "$1,197",
    tagline: "For multi-location and higher volume teams.",
    features: [
      "Up to 5,000 answered calls / month",
      "Unlimited AI phone numbers",
      "Dedicated success partner",
      "Custom reporting & integrations",
    ],
    badge: null as "Most popular" | null,
  },
] as const;

export function OutcomeCardsSection() {
  return (
    <section className="py-16 md:py-20 border-t border-white/[0.06] bg-[var(--bg-base)]">
      <Container>
        <div className="max-w-3xl mb-10">
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            What you get from day one
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Outcomes, not infrastructure. Your AI handles the rest.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-white/80" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                Simple pricing that matches your revenue
              </h2>
              <p className="mt-2 text-sm text-white/50 max-w-xl">
                No per-seat licenses. You pay for reliability of answered calls,
                not how many people log in.
              </p>
            </div>
            <p className="text-xs text-white/40">
              All plans start with a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border bg-[var(--bg-card)] p-6 flex flex-col ${
                  tier.badge
                    ? "border-white/20 shadow-[0_0_40px_rgba(15,23,42,0.8)] relative overflow-hidden"
                    : "border-[var(--border-default)]"
                }`}
              >
                {tier.badge && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                )}
                {tier.badge && (
                  <span className="self-start mb-3 inline-flex items-center rounded-full bg-white text-black text-[11px] font-semibold px-2.5 py-1">
                    {tier.badge}
                  </span>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-white">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/50">{tier.tagline}</p>
                </div>
                <div className="mb-5">
                  <span className="text-3xl font-semibold text-white">
                    {tier.price}
                  </span>
                  <span className="text-sm text-white/40 ml-1">/month</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-white/60">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/50" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-colors"
                >
                  Start free trial →
                </button>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
