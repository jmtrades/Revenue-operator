import type { MetadataRoute } from "next";

const BASE = "https://www.recall-touch.com";

const INDUSTRY_SLUGS = [
  "plumbing-hvac",
  "dental",
  "legal",
  "real-estate",
  "healthcare",
  "roofing",
  "med-spa",
  "recruiting",
  "auto-repair",
  "insurance",
  "construction",
];
const COMPARE_SLUGS = ["smith-ai", "ruby", "gohighlevel", "hiring-receptionist"];

const BLOG_SLUGS = [
  "how-ai-phone-agents-work",
  "5-signs-losing-revenue-missed-calls",
  "recall-touch-vs-hiring",
  "setup-guide-5-minutes",
  "why-missed-calls-cost-more",
  "speed-to-lead-60-second-rule",
  "after-hours-lead-capture",
  "voicemail-to-appointment",
  "missed-call-metrics-revenue",
  "follow-up-speed-automation",
  "agency-partner-dashboard-15-percent-share",
  "auto-generated-case-studies-from-revenue-recovered",
  "customer-health-scoring-churn-prediction",
  "status-page-for-ai-phone-systems",
  "missed-calls-dental-revenue-loss",
  "ai-vs-human-receptionist-real-cost",
  "what-is-ai-revenue-operations-complete-guide",
  "automated-no-show-recovery-playbook",
  "speed-to-lead-response-time-revenue",
  "hvac-companies-how-to-answer-every-call-without-hiring",
  "legal-intake-automation-capture-every-potential-client",
  "how-to-calculate-your-missed-call-revenue-leak",
  "recall-touch-vs-smith-ai-which-is-right",
  "follow-up-playbook-why-80-percent-of-revenue-second-touch",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${BASE}/activate`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${BASE}/results`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${BASE}/status`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/security`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/outbound`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/enterprise`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/product`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/demo`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/terms/voice-cloning`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 },
  ];
  for (const slug of BLOG_SLUGS) {
    entries.push({ url: `${BASE}/blog/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 });
  }
  for (const slug of INDUSTRY_SLUGS) {
    entries.push({ url: `${BASE}/industries/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 });
  }
  for (const slug of COMPARE_SLUGS) {
    entries.push({ url: `${BASE}/compare/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 });
  }
  return entries;
}
