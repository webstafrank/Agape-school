import type { Metadata } from "next";
import { site } from "@/content/site";

/** Open Graph defaults shared by every page (Next merges metadata shallowly). */
export const baseOpenGraph = {
  siteName: site.name,
  locale: "en_KE",
  type: "website",
} as const;

type PageMetadataInput = {
  title: string;
  description: string;
  /** Path of the page, e.g. "/about" — used for the canonical URL. */
  path: string;
  type?: "website" | "article";
  /** Absolute share-image URL (e.g. a news cover photo); defaults to the site card. */
  image?: { url: string; alt: string };
};

/** The generated site card from `app/opengraph-image.tsx`. */
export const defaultShareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${site.name} — ${site.motto}`,
};

/**
 * Title, description, canonical URL, and social-share tags for a public page.
 * The default share image comes from `app/opengraph-image.tsx`.
 */
export function pageMetadata({ title, description, path, type = "website", image }: PageMetadataInput): Metadata {
  const fullTitle = `${title} | ${site.name}`;
  // A page's openGraph replaces the layout's wholesale (including the
  // file-based image), so the image must be set here explicitly.
  const images = [image ?? defaultShareImage];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, type, title: fullTitle, description, url: path, images },
    twitter: { card: "summary_large_image", title: fullTitle, description, images },
  };
}
