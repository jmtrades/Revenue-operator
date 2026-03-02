export const ROUTES = {
  START: "/activate",
  SIGN_IN: "/sign-in",
  PRICING: "/pricing",
  PRODUCT: "/product",
  DOCS: "/docs",
  CONTACT: "/contact",
  DEMO: "/demo",
  ONBOARDING: "/onboarding",
  BOOK_DEMO: "/contact",
} as const;

export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, label: "Product" },
  { href: ROUTES.PRICING, label: "Pricing" },
  { href: ROUTES.DOCS, label: "Documentation" },
] as const;

export const PRICING_TIERS = [
  {
    name: "Starter",
    priceMonthly: "$97",
    priceAnnual: "$79",
    period: "/mo",
    description: "For solo operators",
    features: [
      "200 inbound min included",
      "25 outbound calls",
      "50 SMS",
      "1 AI agent",
      "Call recording + transcription",
      "Lead capture + instant alerts",
      "1 phone number",
      "Overage: $0.35/min inbound",
    ],
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Growth",
    priceMonthly: "$247",
    priceAnnual: "$206",
    period: "/mo",
    description: "For growing businesses",
    features: [
      "750 inbound min included",
      "200 outbound calls",
      "200 SMS",
      "3 AI agents",
      "Appointment booking",
      "Campaign builder",
      "Analytics",
      "Overage: $0.28/min inbound",
    ],
    cta: "Start free",
    href: "/activate",
    popular: true,
  },
  {
    name: "Scale",
    priceMonthly: "$497",
    priceAnnual: "$414",
    period: "/mo",
    description: "For established businesses",
    features: [
      "2,500 inbound min included",
      "750 outbound calls",
      "Unlimited SMS",
      "Unlimited AI agents",
      "Multi-location",
      "Compliance + export",
      "API + webhooks",
      "Priority support",
    ],
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    period: "",
    description: "Volume pricing, min $997/mo",
    features: [
      "White label",
      "Custom compliance",
      "SSO + SAML",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Talk to sales",
    href: "/contact",
    popular: false,
  },
] as const;

export const FOOTER_PRODUCT = [
  { label: "Features", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Documentation", href: "/docs" },
  { label: "Changelog", href: "/docs#changelog" },
  { label: "API", href: "/docs#api" },
] as const;

export const FOOTER_COMPANY = [
  { label: "About", href: "/product" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

export const FOOTER_LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export const PRICING_FAQ = [
  { q: "Can I switch plans later?", a: "Yes. You can upgrade or downgrade at any time. Changes take effect at the start of the next billing period." },
  { q: "What counts as a governed call?", a: "Any voice call that is recorded, transcribed, and stored under your declared jurisdiction and compliance framework." },
  { q: "Is there a free trial?", a: "All plans include a 14-day free trial. No credit card required to start." },
  { q: "Do you offer annual billing?", a: "Annual billing is available for all plans. Two months free (17% off) when you commit annually." },
  { q: "What compliance frameworks are supported?", a: "Recall Touch supports jurisdiction-based controls (US, UK, EU) and configurable review depth (preview required, approval required, or standard)." },
  { q: "Can I export my records?", a: "Yes. All plans include an audit trail. Team plans include full export and API access for record retrieval." },
  { q: "What happens if I exceed my call limit?", a: "Recall Touch will notify you before you reach your limit. You can upgrade your plan or add capacity. No automatic overage charges." },
  { q: "Do you offer volume discounts?", a: "Team and enterprise plans support custom pricing and volume discounts. Email hello@recall-touch.com for details." },
  { q: "Can I port my existing number?", a: "Yes. Number porting is supported. Start with a new number and port later, or contact support to port during setup." },
  { q: "How do I set up call forwarding?", a: "After signup, you get step-by-step instructions. Docs include carrier-specific steps for AT&T, Verizon, T-Mobile, and others." },
] as const;

export const COMPARISON_FEATURES = [
  { category: "Core", name: "Inbound min/mo", starter: "200", professional: "750", business: "2,500", enterprise: "Custom" },
  { category: "Core", name: "AI agents", starter: "1", professional: "3", business: "Unlimited", enterprise: "Custom" },
  { category: "Core", name: "Outbound calls/mo", starter: "25", professional: "200", business: "750", enterprise: "Custom" },
  { category: "Features", name: "Appointment booking", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Campaign builder", starter: "—", professional: "✓", business: "✓", enterprise: "✓" },
  { category: "Features", name: "Compliance export", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
  { category: "Support", name: "Priority support", starter: "—", professional: "—", business: "✓", enterprise: "✓" },
] as const;
