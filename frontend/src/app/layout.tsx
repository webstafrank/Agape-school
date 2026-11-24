import type { Metadata } from "next";
import { Comfortaa, Nunito_Sans } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { site } from "@/content/site";
import { baseOpenGraph } from "@/lib/metadata";
import "./globals.css";

const display = Comfortaa({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const homeTitle = `${site.name} — ${site.motto}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: homeTitle,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: { ...baseOpenGraph, title: homeTitle, description: site.description },
  twitter: { card: "summary_large_image", title: homeTitle, description: site.description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* First Tab stop: lets keyboard users jump past the navigation. */}
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-accent-400 px-5 py-3 font-bold text-primary-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
