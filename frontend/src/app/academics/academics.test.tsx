import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { academicSections } from "@/content/academics";
import SectionPage, { dynamicParams, generateMetadata, generateStaticParams } from "./[section]/page";
import AcademicsPage from "./page";

const params = (section: string) => ({ params: Promise.resolve({ section }) });

describe("Academics overview", () => {
  it("links to all three section pages", () => {
    render(<AcademicsPage />);
    const list = screen.getByRole("heading", { name: "Our three sections" }).closest("section")!;
    for (const s of academicSections) {
      expect(within(list).getByRole("heading", { level: 3, name: s.name }).closest("a")).toHaveAttribute(
        "href",
        `/academics/${s.slug}`,
      );
    }
  });

  it("marks Overview as current in the academics tabs", () => {
    render(<AcademicsPage />);
    const tabs = screen.getByRole("navigation", { name: "Academics sections" });
    expect(within(tabs).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  });
});

describe("Academic section pages", () => {
  it("pre-renders exactly the three sections and 404s anything else", () => {
    expect(generateStaticParams()).toEqual([
      { section: "kindergarten" },
      { section: "primary" },
      { section: "junior-secondary" },
    ]);
    expect(dynamicParams).toBe(false);
  });

  it.each(academicSections.map((s) => [s.slug, s] as const))("renders %s from the content layer", async (slug, s) => {
    render(await SectionPage(params(slug)));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(s.name);
    const areas = screen.getByRole("heading", { name: "Learning areas" }).parentElement!;
    for (const area of s.learningAreas) {
      expect(within(areas).getByText(area)).toBeInTheDocument();
    }
    const tabs = screen.getByRole("navigation", { name: "Academics sections" });
    expect(within(tabs).getByRole("link", { name: s.name })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Admissions" })).toHaveAttribute("href", "/admissions");
  });

  it("calls notFound for an unknown section", async () => {
    await expect(SectionPage(params("senior-secondary"))).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });

  it("sets a per-section page title", async () => {
    await expect(generateMetadata(params("primary"))).resolves.toMatchObject({ title: "Primary — Academics" });
    await expect(generateMetadata(params("nope"))).resolves.toEqual({});
  });
});
