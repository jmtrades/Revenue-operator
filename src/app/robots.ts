import type { MetadataRoute } from "next";

const BASE = "https://www.recall-touch.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/product", "/docs", "/contact", "/demo", "/activate", "/blog", "/industries/", "/privacy", "/terms"],
        disallow: ["/app/", "/api/", "/dashboard/", "/admin/", "/ops/", "/sign-in"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
