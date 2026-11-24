import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contact } from "@/content/contact";
import { site } from "@/content/site";
import ContactPage, { metadata } from "./page";

describe("Contact page", () => {
  it("shows phone, email, and address as actionable links", () => {
    render(<ContactPage />);
    const details = screen.getByRole("region", { name: "Contact details" });
    expect(within(details).getByRole("link", { name: /Call us/ })).toHaveAttribute(
      "href",
      `tel:${site.contact.phone.replace(/\s/g, "")}`,
    );
    expect(within(details).getByRole("link", { name: /Email us/ })).toHaveAttribute("href", `mailto:${site.contact.email}`);
    const visit = within(details).getByRole("link", { name: /Visit us/ });
    expect(visit).toHaveAttribute("target", "_blank");
    expect(visit).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("embeds a lazy-loaded Google map for the configured location", () => {
    render(<ContactPage />);
    const map = screen.getByTitle(`Map showing ${site.name}`);
    expect(map).toHaveAttribute("src", `https://www.google.com/maps?q=${encodeURIComponent(contact.map.query)}&output=embed`);
    expect(map).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("link", { name: /Get directions/ })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps/dir/"),
    );
  });

  it("lists office hours and links to admissions", () => {
    render(<ContactPage />);
    for (const h of contact.hours.items) expect(screen.getByText(h.days)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: contact.admissionsPrompt.linkLabel })).toHaveAttribute("href", "/admissions");
  });

  it("has canonical and social metadata", () => {
    expect(metadata).toMatchObject({ title: "Contact us", alternates: { canonical: "/contact" } });
  });
});
