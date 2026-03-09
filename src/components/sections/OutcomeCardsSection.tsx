import { Container } from "@/components/ui/Container";
import { Phone, UserPlus, CalendarCheck } from "lucide-react";

const CARDS = [
  {
    icon: Phone,
    title: "Missed calls recovered",
    description: "Your AI answers 24/7 so every caller gets a real conversation, not voicemail.",
  },
  {
    icon: UserPlus,
    title: "Leads captured automatically",
    description: "Name, phone, and what they need — captured and routed in seconds.",
  },
  {
    icon: CalendarCheck,
    title: "Appointments booked on the spot",
    description: "Integrated with your calendar. No back-and-forth, no no-shows.",
  },
] as const;

export function OutcomeCardsSection() {
  return (
    <section
      className="py-16 md:py-20 border-t border-white/[0.06] bg-[var(--bg-base)]"
    >
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
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-white/80" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
