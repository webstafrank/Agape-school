import Link from "next/link";
import { mainNav, site } from "@/content/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-primary-950 text-primary-100">
      <div className="mx-auto grid max-w-content gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <div>
          <p className="font-display text-xl font-bold text-ink-inverse">{site.name}</p>
          <p className="mt-2 font-display text-lg italic text-accent-300">{site.motto}</p>
          <p className="mt-3 text-sm text-primary-200">{site.sections.join(" · ")}</p>
        </div>

        <nav aria-label="Footer">
          <p className="text-sm font-bold uppercase tracking-wide text-accent-300">Explore</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {mainNav.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-ink-inverse hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <address className="not-italic">
          <p className="text-sm font-bold uppercase tracking-wide text-accent-300">Contact</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{site.contact.address}</li>
            <li>
              <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="hover:text-ink-inverse hover:underline">
                {site.contact.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.contact.email}`} className="break-all hover:text-ink-inverse hover:underline">
                {site.contact.email}
              </a>
            </li>
          </ul>
        </address>
      </div>
      <div className="border-t border-primary-800">
        <p className="mx-auto max-w-content px-4 py-4 text-xs text-primary-300 sm:px-6">
          © {year} {site.name}. {site.motto}
        </p>
      </div>
    </footer>
  );
}
