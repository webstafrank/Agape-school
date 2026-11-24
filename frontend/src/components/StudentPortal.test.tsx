import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Announcement, FeeRecord, Result, SchoolProfile, TimetableEntry, User } from "@/lib/api";
import { formatClock, formatKes, formatScore, schoolWeekday } from "@/lib/format";
import { groupByTerm } from "@/lib/results";
import { StudentAnnouncements } from "./StudentAnnouncements";
import { StudentDashboard } from "./StudentDashboard";
import { StudentFees } from "./StudentFees";
import { StudentResults } from "./StudentResults";
import { StudentTimetable } from "./StudentTimetable";

vi.mock("next/navigation", () => ({ usePathname: () => "/portal/student" }));

const user: User = { id: 1, username: "TEST-A", first_name: "Testa", last_name: "Example", email: "", role: "student" };
vi.mock("./PortalShell", () => ({ usePortalUser: () => user }));

const api = vi.hoisted(() => ({
  getSchoolProfile: vi.fn(),
  getResults: vi.fn(),
  getTimetable: vi.fn(),
  getAnnouncements: vi.fn(),
  getFees: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), ...api }));

const result = (o: Partial<Result>): Result => ({
  id: 1, student: 1, student_name: "Testa", school_class: 1, subject: 1, subject_name: "Mathematics", term: 2,
  term_label: "Term 2 2026", score: "82.00", level: "EE", level_label: "Exceeding Expectations", comment: "",
  updated_at: "2026-07-01T00:00:00Z", ...o,
});
const RESULTS = [
  result({ id: 1, subject_name: "Mathematics", score: "82.00", level: "EE", comment: "Excellent work" }),
  result({ id: 2, subject_name: "English", score: "61.50", level: "ME", level_label: "Meeting Expectations" }),
  result({ id: 3, term: 1, term_label: "Term 1 2026", subject_name: "Mathematics", score: "40.00", level: "AE",
           level_label: "Approaching Expectations" }),
];
const lesson = (o: Partial<TimetableEntry>): TimetableEntry => ({
  id: 1, school_class: 1, class_name: "Grade 5 Demo", subject: 1, subject_name: "Mathematics", teacher_name: "Tutor Example",
  day: 1, day_label: "Monday", start_time: "08:00:00", end_time: "08:35:00", room: "Room 5", ...o,
});
const TIMETABLE = [
  lesson({ id: 1, day: 3, subject_name: "Science", start_time: "08:00:00", end_time: "08:35:00" }),
  lesson({ id: 2, day: 3, subject_name: "Kiswahili", start_time: "13:05:00", end_time: "13:40:00" }),
  lesson({ id: 3, day: 1, subject_name: "Art" }),
];
const notice = (o: Partial<Announcement>): Announcement => ({
  id: 1, title: "Notice", body: "Body", school_class: null, class_name: null, author_name: "Tutor Example",
  published_at: "2026-11-20T07:00:00Z", updated_at: "2026-11-20T07:00:00Z", ...o,
});
const fee = (o: Partial<FeeRecord>): FeeRecord => ({
  id: 1, student: 1, term: 2, term_label: "Term 2 2026", amount_due: "32000.00", amount_paid: "14500.00",
  balance: "17500.00", updated_at: "2026-07-01T00:00:00Z", ...o,
});
const PROFILE: SchoolProfile = {
  id: 1, username: "TEST-A", name: "Testa Example", role: "student",
  school_class: { id: 1, name: "Grade 5 Demo", grade: "grade-5", grade_label: "Grade 5", section: "primary", year: 2026 },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-25T06:00:00Z")); // Wednesday, 9 am in Nairobi
  api.getSchoolProfile.mockResolvedValue(PROFILE);
  api.getResults.mockResolvedValue(RESULTS);
  api.getTimetable.mockResolvedValue(TIMETABLE);
  api.getAnnouncements.mockResolvedValue([
    notice({ id: 1, title: "Half-term" }),
    notice({ id: 2, title: "Homework", school_class: 1, class_name: "Grade 5 Demo" }),
    notice({ id: 3, title: "Swimming" }),
    notice({ id: 4, title: "Fourth one" }),
  ]);
  api.getFees.mockResolvedValue([fee({}), fee({ id: 2, term: 1, term_label: "Term 1 2026", amount_paid: "32000.00", balance: "0.00" })]);
});

afterEach(() => {
  vi.useRealTimers();
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe("helpers", () => {
  it("groups results by term with averages, newest first", () => {
    const groups = groupByTerm(RESULTS);
    expect(groups.map((g) => [g.label, g.average, g.results.length])).toEqual([
      ["Term 2 2026", 71.8, 2],
      ["Term 1 2026", 40, 1],
    ]);
  });

  it("formats clocks, shillings, scores, and the school weekday", () => {
    expect(formatClock("08:05:00")).toBe("8:05 am");
    expect(formatClock("12:30:00")).toBe("12:30 pm");
    expect(formatClock("00:15:00")).toBe("12:15 am");
    expect(formatKes("17500.00")).toMatch(/^Ksh\s17,500$/); // Intl uses a no-break space
    expect(formatScore("77.50")).toBe("77.5");
    expect(schoolWeekday(new Date("2026-11-29T22:30:00Z"))).toBe(1); // Sunday UTC = Monday 1:30 am Nairobi
  });
});

describe("Student dashboard", () => {
  it("greets the student and shows their class", async () => {
    render(<StudentDashboard />);
    expect(screen.getByRole("heading", { level: 1, name: "Welcome, Testa" })).toBeInTheDocument();
    expect(await screen.findByText("Grade 5 Demo · Grade 5")).toBeInTheDocument();
  });

  it("summarises latest results, today's lessons, recent announcements, and fee balance", async () => {
    render(<StudentDashboard />);
    const results = screen.getByRole("region", { name: "Latest results" });
    expect(await within(results).findByText(/Term 2 2026/)).toBeInTheDocument();
    expect(within(results).getByText("71.8")).toBeInTheDocument();
    expect(within(results).queryByText("40")).not.toBeInTheDocument(); // older term hidden

    const today = screen.getByRole("region", { name: "Today's lessons" });
    expect(await within(today).findByText("Science")).toBeInTheDocument();
    expect(within(today).getByText("Kiswahili")).toBeInTheDocument();
    expect(within(today).queryByText("Art")).not.toBeInTheDocument(); // Monday's lesson

    const news = screen.getByRole("region", { name: "Latest announcements" });
    expect(await within(news).findByText("Half-term")).toBeInTheDocument();
    expect(within(news).queryByText("Fourth one")).not.toBeInTheDocument();

    const fees = screen.getByRole("region", { name: "Fee balance" });
    expect(await within(fees).findByText("Ksh 17,500")).toBeInTheDocument();
  });

  it("explains a weekend instead of showing lessons", async () => {
    vi.setSystemTime(new Date("2026-11-28T06:00:00Z")); // Saturday
    render(<StudentDashboard />);
    expect(await screen.findByText(/enjoy your weekend/)).toBeInTheDocument();
  });

  it("tells a student without a class to contact the office", async () => {
    api.getSchoolProfile.mockResolvedValue({ ...PROFILE, school_class: null });
    render(<StudentDashboard />);
    expect(await screen.findByText(/haven't been placed in a class/)).toBeInTheDocument();
  });

  it("shows a retryable error on one card without breaking the others", async () => {
    api.getFees.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce([fee({})]);
    render(<StudentDashboard />);
    const fees = screen.getByRole("region", { name: "Fee balance" });
    expect(await within(fees).findByRole("alert")).toHaveTextContent("couldn't load");
    expect(await screen.findByText("Science")).toBeInTheDocument();
    await userEvent.setup().click(within(fees).getByRole("button", { name: "Try again" }));
    expect(await within(fees).findByText("Ksh 17,500")).toBeInTheDocument();
  });
});

describe("Student results page", () => {
  it("shows the newest term and switches terms", async () => {
    render(<StudentResults />);
    const table = await screen.findByRole("table");
    expect(within(table).getByRole("rowheader", { name: /Mathematics/ })).toHaveTextContent("Excellent work");
    expect(within(table).getByText("61.5")).toBeInTheDocument();
    expect(screen.getByText("71.8")).toBeInTheDocument();

    vi.useRealTimers();
    await userEvent.setup().selectOptions(screen.getByLabelText("Term"), "Term 1 2026");
    expect(screen.getByRole("heading", { name: "Term 1 2026" })).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("40")).toBeInTheDocument();
    expect(screen.getByText("Approaching Expectations", { exact: false })).toBeInTheDocument();
  });

  it("explains when no results are released", async () => {
    api.getResults.mockResolvedValue([]);
    render(<StudentResults />);
    expect(await screen.findByText(/once the school publishes them/)).toBeInTheDocument();
  });
});

describe("Student timetable page", () => {
  it("lays out the week and marks today", async () => {
    render(<StudentTimetable />);
    const wednesday = (await screen.findByRole("heading", { name: /Wednesday/ })).closest("li")!;
    expect(wednesday).toHaveAttribute("aria-current", "date");
    expect(within(wednesday).getByText("1:05 pm")).toBeInTheDocument();
    const monday = screen.getByRole("heading", { name: "Monday" }).closest("li")!;
    expect(within(monday).getByText("Art")).toBeInTheDocument();
    expect(monday).not.toHaveAttribute("aria-current");
  });
});

describe("Student announcements and fees pages", () => {
  it("labels class and whole-school announcements", async () => {
    render(<StudentAnnouncements />);
    const homework = (await screen.findByRole("heading", { name: "Homework" })).closest("article")!;
    expect(homework).toHaveTextContent("Grade 5 Demo");
    const halfTerm = screen.getByRole("heading", { name: "Half-term" }).closest("article")!;
    expect(halfTerm).toHaveTextContent("Whole school");
  });

  it("shows each term's fees and celebrates a paid-up term", async () => {
    render(<StudentFees />);
    const term2 = (await screen.findByRole("heading", { name: "Term 2 2026" })).closest("li")!;
    expect(term2).toHaveTextContent("Ksh 17,500");
    const term1 = screen.getByRole("heading", { name: "Term 1 2026" }).closest("li")!;
    expect(term1).toHaveTextContent("Fully paid");
  });
});
