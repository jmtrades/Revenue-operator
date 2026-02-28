export const ROUTES = {
  START: "/activate",
  SIGN_IN: "/dashboard/start",
  PRICING: "/pricing",
  PRODUCT: "/product",
  DOCS: "/docs",
  CONTACT: "/#contact",
  BOOK_DEMO: "/activate",
} as const;

export const NAV_LINKS = [
  { href: ROUTES.PRODUCT, label: "Product" },
  { href: ROUTES.PRICING, label: "Pricing" },
  { href: ROUTES.DOCS, label: "Documentation" },
] as const;

export const PRICING_TIERS = [
  {
    name: "Solo",
    priceMonthly: "$49",
    priceAnnual: "$39",
    period: "/mo",
    description: "1 operator",
    features: ["Basic compliance", "Encrypted records", "Audit trail"],
    cta: "Start free",
    href: "/activate",
    popular: false,
  },
  {
    name: "Growth",
    priceMonthly: "$149",
    priceAnnual: "$119",
    period: "/mo",
    description: "Up to 5 operators",
    features: ["Priority compliance", "Follow-up automation", "API access"],
    cta: "Start free",
    href: "/activate",
    popular: true,
  },
  {
    name: "Team",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    period: "",
    description: "Unlimited operators",
    features: ["Custom compliance", "SSO", "Audit log", "Dedicated support"],
    cta: "Get in touch",
    href: "/activate",
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
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
] as const;

export const FOOTER_LEGAL = [
  { label: "Privacy", href: "/#privacy" },
  { label: "Terms", href: "/#terms" },
] as const;

export const PRICING_FAQ = [
  { q: "Can I switch plans later?", a: "Yes. You can upgrade or downgrade at any time. Changes take effect at the start of the next billing period." },
  { q: "What counts as a governed call?", a: "Any voice call that is recorded, transcribed, and stored under your declared jurisdiction and compliance framework." },
  { q: "Is there a free trial?", a: "All plans include a 14-day free trial. No credit card required to start." },
  { q: "Do you offer annual billing?", a: "Annual billing is available for Growth and Team. Two months are applied without interruption on annual commitment." },
  { q: "What compliance frameworks are supported?", a: "Recall Touch supports jurisdiction-based controls (US, UK, EU) and configurable review depth (preview required, approval required, or standard)." },
  { q: "Can I export my records?", a: "Yes. All plans include an audit trail. Team plans include full export and API access for record retrieval." },
  { q: "What happens if I exceed my call limit?", a: "We will notify you before you reach your limit. You can upgrade your plan or add capacity. No automatic overage charges." },
  { q: "Do you offer volume discounts?", a: "Team and enterprise plans support custom pricing and volume discounts. Contact us for details." },
] as const;

export const COMPARISON_FEATURES = [
  { category: "Core", name: "Operators", solo: "1", growth: "Up to 5", team: "Unlimited" },
  { category: "Core", name: "Governed calls", solo: "200/mo", growth: "1,000/mo", team: "Unlimited" },
  { category: "Compliance", name: "Encrypted records", solo: "✓", growth: "✓", team: "✓" },
  { category: "Compliance", name: "Audit trail", solo: "✓", growth: "✓", team: "✓" },
  { category: "Compliance", name: "Jurisdiction controls", solo: "✓", growth: "✓", team: "✓" },
  { category: "Automation", name: "Follow-up automation", solo: "—", growth: "✓", team: "✓" },
  { category: "Automation", name: "API access", solo: "—", growth: "✓", team: "✓" },
  { category: "Support", name: "Dedicated support", solo: "—", growth: "—", team: "✓" },
] as const;
