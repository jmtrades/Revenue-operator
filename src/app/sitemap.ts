import type { MetadataRoute } from "next";

const BASE = "https://recall-touch.com";

const INDUSTRY_SLUGS = ["home-services", "healthcare", "legal", "real-estate", "insurance", "b2b-sales", "local-business", "contractors"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${BASE}/activate`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${BASE}/sign-in`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/app`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/product`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/demo`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/docs`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${BASE}/blog/why-missed-calls-cost-more`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/blog/speed-to-lead-60-second-rule`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/blog/voice-agent-vs-receptionist-cost`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/app/onboarding`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/app/activity`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${BASE}/app/contacts`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/app/agents`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/app/campaigns`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/app/messages`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/app/calendar`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/app/analytics`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/app/settings`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
  ];
  for (const slug of INDUSTRY_SLUGS) {
    entries.push({ url: `${BASE}/industries/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 });
  }
  return entries;
}
