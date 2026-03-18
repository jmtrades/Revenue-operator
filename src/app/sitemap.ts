import type { MetadataRoute } from "next";

const BASE = "https://www.recall-touch.com";

const INDUSTRY_SLUGS = ["plumbing-hvac", "dental", "legal", "real-estate", "healthcare"];
const COMPARE_SLUGS = ["smith-ai", "ruby", "gohighlevel", "hiring-receptionist"];

const BLOG_SLUGS = [
  "how-ai-phone-agents-work",
  "5-signs-losing-revenue-missed-calls",
  "recall-touch-vs-hiring",
  "setup-guide-5-minutes",
  "why-missed-calls-cost-more",
  "speed-to-lead-60-second-rule",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${BASE}/activate`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/product`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/demo`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 },
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
