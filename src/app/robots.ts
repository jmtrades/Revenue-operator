import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/pricing",
          "/product",
          "/docs",
          "/contact",
          "/demo",
          "/activate",
          "/blog",
          "/blog/",
          "/industries/",
          "/compare/",
          "/outbound",
          "/enterprise",
          "/security",
          "/safety",
          "/trust",
          "/results",
          "/privacy",
          "/terms",
        ],
        disallow: ["/app/", "/api/", "/dashboard/", "/admin/", "/ops/", "/sign-in"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
