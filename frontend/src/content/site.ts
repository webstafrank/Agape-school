/**
 * Site-wide copy and navigation. Kept out of components so an admin can
 * later edit it without code changes.
 */

export type NavLink = {
  label: string;
  href: string;
};

export const site = {
  name: "Agape Education Center",
  shortName: "Agape",
  motto: "Your future is here.",
  description:
    "Agape Education Center — Kindergarten, Primary, and Junior Secondary. Your future is here.",
  sections: ["Kindergarten", "Primary", "Junior Secondary"],
  /** Dates and times on the site are shown in the school's local time. */
  timeZone: "Africa/Nairobi",
  locale: "en-KE",
  contact: {
    // Placeholder details — replace with the school's real contact info.
    phone: "+254 700 000 000",
    email: "info@agape.example",
    address: "Agape Education Center, Kenya",
  },
} as const;

export const mainNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "News & Events", href: "/news" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export const portalLink: NavLink = { label: "Portal login", href: "/login" };
