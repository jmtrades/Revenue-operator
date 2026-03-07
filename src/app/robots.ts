import type { MetadataRoute } from "next";

const BASE = "https://www.recall-touch.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/app/", "/api/"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
