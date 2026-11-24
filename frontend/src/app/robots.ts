import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Portals are private; keep them out of search results.
    rules: { userAgent: "*", allow: "/", disallow: ["/portal/", "/login"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
