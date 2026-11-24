import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { site } from "@/content/site";
import { metadata as aboutMeta } from "./about/page";
import { generateMetadata as sectionMeta } from "./academics/[section]/page";
import { metadata as academicsMeta } from "./academics/page";
import { metadata as admissionsMeta } from "./admissions/page";
import { metadata as contactMeta } from "./contact/page";
import { metadata as galleryMeta } from "./gallery/page";
import { metadata as rootMeta } from "./layout";
import { metadata as newsMeta } from "./news/page";
import { metadata as homeMeta } from "./page";
import robots from "./robots";
import sitemap from "./sitemap";

// next/font is a build-time transform; stub it so the layout module can load.
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "font-var", className: "font-class" });
  return { Fraunces: font, Nunito_Sans: font };
});

const api = vi.hoisted(() => ({ getPosts: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

describe("SEO metadata", () => {
  it("root layout sets the motto, base URL, and Open Graph defaults", () => {
    expect(rootMeta.metadataBase?.toString()).toBe(`${site.url}/`);
    expect(String((rootMeta.title as { default: string }).default)).toContain("Your future is here");
    expect(rootMeta.openGraph).toMatchObject({ siteName: site.name, type: "website" });
    expect(rootMeta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it.each<[string, Metadata, string]>([
    ["home", homeMeta, "/"],
    ["about", aboutMeta, "/about"],
    ["academics", academicsMeta, "/academics"],
    ["admissions", admissionsMeta, "/admissions"],
    ["news", newsMeta, "/news"],
    ["gallery", galleryMeta, "/gallery"],
    ["contact", contactMeta, "/contact"],
  ])("%s page has a canonical URL", (_, meta, path) => {
    expect(meta.alternates?.canonical).toBe(path);
  });

  it.each<[string, Metadata]>([
    ["about", aboutMeta],
    ["academics", academicsMeta],
    ["admissions", admissionsMeta],
    ["news", newsMeta],
    ["gallery", galleryMeta],
    ["contact", contactMeta],
  ])("%s page keeps the site name in its share title", (_, meta) => {
    expect(meta.openGraph).toMatchObject({
      siteName: site.name,
      title: expect.stringContaining(site.name),
      images: [expect.objectContaining({ url: "/opengraph-image" })],
    });
    expect(meta.twitter).toMatchObject({ images: [expect.objectContaining({ url: "/opengraph-image" })] });
    expect(meta.description).toBeTruthy();
  });

  it("academic sections get their own canonical URL", async () => {
    const meta = await sectionMeta({ params: Promise.resolve({ section: "primary" }) });
    expect(meta.alternates?.canonical).toBe("/academics/primary");
  });
});

describe("robots and sitemap", () => {
  it("keeps portals out of search and points to the sitemap", () => {
    const r = robots();
    expect(r.rules).toMatchObject({ allow: "/", disallow: ["/portal/", "/login"] });
    expect(r.sitemap).toBe(`${site.url}/sitemap.xml`);
  });

  it("lists public pages, academic sections, and published posts", async () => {
    api.getPosts.mockResolvedValueOnce([{ slug: "sports-day", published_at: "2026-11-20T07:00:00Z" }]);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        site.url,
        `${site.url}/contact`,
        `${site.url}/academics/junior-secondary`,
        `${site.url}/news/sports-day`,
      ]),
    );
    expect(urls.some((u) => u.includes("/portal") || u.includes("/login"))).toBe(false);
  });

  it("still lists static pages if the API is down", async () => {
    api.getPosts.mockRejectedValueOnce(new TypeError("fetch failed"));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${site.url}/gallery`);
  });
});
