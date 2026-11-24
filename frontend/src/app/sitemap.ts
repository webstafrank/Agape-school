import type { MetadataRoute } from "next";
import { academicSections } from "@/content/academics";
import { mainNav, site } from "@/content/site";
import { getPosts } from "@/lib/api";

// Rebuild hourly so new news posts are listed.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    ...mainNav.map((l) => l.href),
    ...academicSections.map((s) => `/academics/${s.slug}`),
  ].map((path) => ({ url: `${site.url}${path === "/" ? "" : path}` }));

  let posts: MetadataRoute.Sitemap = [];
  try {
    posts = (await getPosts()).map((p) => ({ url: `${site.url}/news/${p.slug}`, lastModified: p.published_at }));
  } catch {
    // API unreachable: list the static pages only.
  }
  return [...pages, ...posts];
}
