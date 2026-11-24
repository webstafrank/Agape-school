/**
 * Accessibility regression tests: key pages and portal views must have no
 * axe (WCAG 2.2 AA) violations. Data comes from mocks; see src/test/axe.ts.
 */
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import AboutPage from "@/app/about/page";
import AdmissionsPage from "@/app/admissions/page";
import ContactPage from "@/app/contact/page";
import NotFound from "@/app/not-found";
import HomePage from "@/app/page";
import { AdminUsers } from "@/components/AdminUsers";
import { LoginForm } from "@/components/LoginForm";
import { MarkSheet } from "@/components/MarkSheet";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StudentDashboard } from "@/components/StudentDashboard";
import { StudentResults } from "@/components/StudentResults";
import { expectNoA11yViolations } from "./axe";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/PortalShell", () => ({
  usePortalUser: () => ({ id: 1, username: "TEST-A", first_name: "Testa", last_name: "Example", email: "", role: "student" }),
}));

const result = {
  id: 1, student: 11, student_name: "Testa", school_class: 3, subject: 1, subject_name: "Mathematics", term: 2,
  term_label: "Term 2 2026", score: "64.00", level: "ME", level_label: "Meeting Expectations", comment: "Good",
  updated_at: "2026-07-01T00:00:00Z",
};
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  isLoggedIn: () => false,
  getSchoolProfile: async () => ({ id: 1, username: "TEST-A", name: "Testa", role: "student",
    school_class: { id: 3, name: "Grade 5 Demo", grade: "grade-5", grade_label: "Grade 5", section: "primary", year: 2026 } }),
  getResults: async () => [result],
  getTimetable: async () => [],
  getAnnouncements: async () => [],
  getFees: async () => [],
  adminApi: {
    users: async () => [{ id: 20, username: "TEST-A", first_name: "Testa", last_name: "Example", email: "", role: "student",
      is_active: true, school_class: 3, class_name: "Grade 5 Demo", last_login: null, date_joined: "2026-01-01T00:00:00Z" }],
    classes: async () => [],
  },
}));

beforeAll(() => {
  // framer-motion reads this; jsdom lacks it.
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});

describe("accessibility (axe, WCAG 2.2 AA)", () => {
  it.each([
    ["Home", HomePage],
    ["About", AboutPage],
    ["Admissions (with enquiry form)", AdmissionsPage],
    ["Contact", ContactPage],
    ["404", NotFound],
  ])("%s page", async (_, Page) => {
    const { container } = render(<Page />);
    await expectNoA11yViolations(container);
  });

  it("site header and footer", async () => {
    const { container } = render(
      <>
        <SiteHeader />
        <main />
        <SiteFooter />
      </>,
    );
    await expectNoA11yViolations(container);
  });

  it("login form", async () => {
    const { container } = render(<LoginForm />);
    await expectNoA11yViolations(container);
  });

  it("student dashboard and results", async () => {
    const { container } = render(
      <>
        <StudentDashboard />
        <StudentResults />
      </>,
    );
    expect(await screen.findAllByText("Mathematics")).not.toHaveLength(0);
    await expectNoA11yViolations(container);
  });

  it("teacher mark sheet", async () => {
    const cls = { id: 3, name: "Grade 5 Demo", grade: "grade-5", grade_label: "Grade 5", section: "primary", year: 2026,
      students: [{ id: 11, username: "TEST-A", name: "Testa Example" }], my_subjects: [] };
    const term = { id: 2, year: 2026, name: "term-2", label: "Term 2 2026", start_date: "2026-04-28", end_date: "2026-08-01",
      is_current: true, results_published: false };
    const { container } = render(<MarkSheet cls={cls} subject={1} term={term} initialResults={[result]} />);
    await expectNoA11yViolations(container);
  });

  it("admin users page", async () => {
    const { container } = render(<AdminUsers />);
    await screen.findByText("Testa Example");
    await expectNoA11yViolations(container);
  });

  it("the checker itself catches problems", async () => {
    // Deliberately broken markup (as a string so the linter doesn't flag it).
    const container = document.createElement("div");
    container.innerHTML = '<img src="/x.png"><input type="text">';
    document.body.append(container);
    await expect(expectNoA11yViolations(container)).rejects.toThrow(/image-alt|label/);
  });
});
