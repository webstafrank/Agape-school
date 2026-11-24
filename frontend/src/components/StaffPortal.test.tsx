import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type Announcement, type Result, type StaffClass, type Term, type TimetableEntry, type User } from "@/lib/api";
import { MarkSheet } from "./MarkSheet";
import { AnnouncementManager } from "./AnnouncementManager";
import { StaffDashboard } from "./StaffDashboard";
import { StaffResults } from "./StaffResults";

const nav = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, router: { replace }, search: "" };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/portal/staff",
  useRouter: () => nav.router,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const teacher: User = { id: 7, username: "STAFF-T", first_name: "Tutor", last_name: "Example", email: "", role: "staff" };
vi.mock("./PortalShell", () => ({ usePortalUser: () => teacher }));

const api = vi.hoisted(() => ({
  saveResultSheet: vi.fn(),
  getSchoolProfile: vi.fn(),
  getTerms: vi.fn(),
  getClass: vi.fn(),
  getClasses: vi.fn(),
  getResults: vi.fn(),
  getTimetable: vi.fn(),
  getAnnouncements: vi.fn(),
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), ...api }));

const CLASS: StaffClass = {
  id: 3, name: "Grade 5 Demo", grade: "grade-5", grade_label: "Grade 5", section: "primary", year: 2026,
  students: [
    { id: 11, username: "TEST-A", name: "Testa Example" },
    { id: 12, username: "TEST-B", name: "Testo Example" },
    { id: 13, username: "TEST-C", name: "Testi Example" },
  ],
  my_subjects: [{ id: 1, name: "Mathematics", code: "maths" }],
};
const term = (o: Partial<Term> = {}): Term => ({
  id: 2, year: 2026, name: "term-2", label: "Term 2 2026", start_date: "2026-04-28", end_date: "2026-08-01",
  is_current: true, results_published: false, ...o,
});
const result = (o: Partial<Result>): Result => ({
  id: 100, student: 11, student_name: "Testa Example", school_class: 3, subject: 1, subject_name: "Mathematics",
  term: 2, term_label: "Term 2 2026", score: "64.00", level: "ME", level_label: "Meeting Expectations",
  comment: "Good work", updated_at: "2026-07-01T00:00:00Z", ...o,
});
const EXISTING = [result({}), result({ id: 101, student: 13, score: "30.00", level: "AE", level_label: "Approaching Expectations", comment: "" })];

beforeEach(() => {
  nav.replace.mockReset();
  nav.search = "";
});
afterEach(() => {
  vi.useRealTimers();
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe("MarkSheet", () => {
  it("prefills saved results and saves only the changed rows", async () => {
    api.saveResultSheet.mockResolvedValueOnce([
      result({ score: "64.00" }),
      result({ id: 102, student: 12, score: "77.50", level: "EE", level_label: "Exceeding Expectations", comment: "Well done" }),
    ]);
    const user = userEvent.setup();
    render(<MarkSheet cls={CLASS} subject={1} term={term()} initialResults={EXISTING} />);

    expect(screen.getByLabelText("Score for Testa Example")).toHaveValue(64);
    expect(screen.getByLabelText("Comment for Testa Example")).toHaveValue("Good work");
    const save = screen.getByRole("button", { name: "Save results" });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText("Score for Testo Example"), "77.5");
    await user.type(screen.getByLabelText("Comment for Testo Example"), "Well done");
    await user.clear(screen.getByLabelText("Score for Testi Example"));
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
    await user.click(save);

    expect(api.saveResultSheet).toHaveBeenCalledWith({
      school_class: 3, subject: 1, term: 2,
      entries: [
        { student: 12, score: 77.5, comment: "Well done" },
        { student: 13, score: null, comment: "" },
      ],
    });
    expect(await screen.findByText("Results saved.")).toBeInTheDocument();
    expect(screen.getByLabelText("Score for Testi Example")).toHaveValue(null);
    expect(within(screen.getByLabelText("Score for Testo Example").closest("li")!).getByText("EE")).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it("checks scores before sending", async () => {
    const user = userEvent.setup();
    render(<MarkSheet cls={CLASS} subject={1} term={term()} initialResults={[]} />);
    await user.type(screen.getByLabelText("Score for Testa Example"), "120");
    await user.click(screen.getByRole("button", { name: "Save results" }));
    expect(api.saveResultSheet).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Score for Testa Example")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a score from 0 to 100.")).toBeInTheDocument();
  });

  it("maps server row errors back to the right students", async () => {
    api.saveResultSheet.mockRejectedValueOnce(new ApiError(400, { entries: [{}, { student: ["This student is not in that class."] }] }));
    const user = userEvent.setup();
    render(<MarkSheet cls={CLASS} subject={1} term={term()} initialResults={[]} />);
    await user.type(screen.getByLabelText("Score for Testa Example"), "50");
    await user.type(screen.getByLabelText("Score for Testo Example"), "60");
    await user.click(screen.getByRole("button", { name: "Save results" }));
    expect(await screen.findByText("This student is not in that class.")).toBeInTheDocument();
    expect(screen.getByLabelText("Score for Testo Example")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Score for Testa Example")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("status")).toHaveTextContent("Some rows need fixing");
  });

  it("shows the server's reason when saving is forbidden", async () => {
    api.saveResultSheet.mockRejectedValueOnce(new ApiError(403, { detail: "You can only enter results for classes and subjects you teach." }));
    const user = userEvent.setup();
    render(<MarkSheet cls={CLASS} subject={1} term={term()} initialResults={[]} />);
    await user.type(screen.getByLabelText("Score for Testa Example"), "50");
    await user.click(screen.getByRole("button", { name: "Save results" }));
    expect(await screen.findByRole("status")).toHaveTextContent("only enter results for classes and subjects you teach");
  });

  it("locks a published term", () => {
    render(<MarkSheet cls={CLASS} subject={1} term={term({ results_published: true })} initialResults={EXISTING} />);
    expect(screen.getByRole("note")).toHaveTextContent("published, so they're locked");
    expect(screen.getByLabelText("Score for Testa Example")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save results" })).not.toBeInTheDocument();
  });
});

describe("StaffResults picker", () => {
  const assignments = [
    { id: 1, school_class: 3, class_name: "Grade 5 Demo", subject: 1, subject_name: "Mathematics" },
    { id: 2, school_class: 4, class_name: "Grade 6 Demo", subject: 2, subject_name: "English" },
  ];
  beforeEach(() => {
    api.getSchoolProfile.mockResolvedValue({ id: 7, username: "STAFF-T", name: "Tutor", role: "staff", assignments });
    api.getTerms.mockResolvedValue([term({ id: 3, label: "Term 3 2026", is_current: false }), term()]);
    api.getClass.mockResolvedValue(CLASS);
    api.getResults.mockResolvedValue(EXISTING);
  });

  it("defaults to the first assignment and the current term", async () => {
    render(<StaffResults />);
    expect(await screen.findByRole("heading", { name: "Grade 5 Demo · Mathematics · Term 2 2026" })).toBeInTheDocument();
    await waitFor(() => expect(api.getResults).toHaveBeenCalledWith({ school_class: 3, subject: 1, term: 2 }));
    expect(await screen.findByLabelText("Score for Testa Example")).toHaveValue(64);
  });

  it("follows the class and subject in the URL and updates it on change", async () => {
    nav.search = "class=4&subject=2";
    render(<StaffResults />);
    expect(await screen.findByRole("heading", { name: /Grade 6 Demo · English/ })).toBeInTheDocument();
    await userEvent.setup().selectOptions(screen.getByLabelText("Term"), "3");
    expect(nav.replace).toHaveBeenCalledWith("/portal/staff/results?class=4&subject=2&term=3");
  });

  it("explains when the teacher has no assignments", async () => {
    api.getSchoolProfile.mockResolvedValue({ id: 7, username: "STAFF-T", name: "Tutor", role: "staff", assignments: [] });
    render(<StaffResults />);
    expect(await screen.findByText(/haven't been assigned any classes/)).toBeInTheDocument();
  });
});

describe("Staff dashboard", () => {
  it("lists classes with result links and only the teacher's own lessons today", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-25T06:00:00Z")); // Wednesday
    const lesson = (o: Partial<TimetableEntry>): TimetableEntry => ({
      id: 1, school_class: 3, class_name: "Grade 5 Demo", subject: 1, subject_name: "Mathematics", teacher: 7,
      teacher_name: "Tutor Example", day: 3, day_label: "Wednesday", start_time: "08:00:00", end_time: "08:35:00", room: "Room 5", ...o,
    });
    api.getClasses.mockResolvedValue([CLASS]);
    api.getTimetable.mockResolvedValue([
      lesson({ id: 1 }),
      lesson({ id: 2, subject_name: "Art", teacher: 99 }),
      lesson({ id: 3, subject_name: "Music", day: 2 }),
    ]);
    api.getAnnouncements.mockResolvedValue([]);
    render(<StaffDashboard />);

    expect(screen.getByRole("heading", { level: 1, name: "Welcome, Tutor" })).toBeInTheDocument();
    const classes = screen.getByRole("region", { name: "My classes" });
    expect(await within(classes).findByText("Grade 5 · 3 students")).toBeInTheDocument();
    expect(within(classes).getByRole("link", { name: /Enter results for Mathematics, Grade 5 Demo/ })).toHaveAttribute(
      "href", "/portal/staff/results?class=3&subject=1",
    );
    const today = screen.getByRole("region", { name: "My lessons today" });
    expect(await within(today).findByText("Mathematics")).toBeInTheDocument();
    expect(within(today).getByText("Grade 5 Demo")).toBeInTheDocument();
    expect(within(today).queryByText("Art")).not.toBeInTheDocument();
    expect(within(today).queryByText("Music")).not.toBeInTheDocument();
  });
});

describe("Staff announcements", () => {
  const ann = (o: Partial<Announcement>): Announcement => ({
    id: 1, title: "Homework", body: "Page 12", school_class: 3, class_name: "Grade 5 Demo", author_name: "Tutor Example",
    is_mine: true, published_at: "2026-11-20T07:00:00Z", updated_at: "2026-11-20T07:00:00Z", ...o,
  });
  beforeEach(() => {
    api.getClasses.mockResolvedValue([CLASS]);
    api.getAnnouncements.mockResolvedValue([ann({}), ann({ id: 2, title: "Half-term", school_class: null, class_name: null, is_mine: false })]);
  });

  it("posts to a class and refreshes the list", async () => {
    api.createAnnouncement.mockResolvedValueOnce(ann({ id: 3 }));
    const user = userEvent.setup();
    render(<AnnouncementManager />);
    await user.type(await screen.findByLabelText("Title"), "Swimming");
    await user.type(screen.getByLabelText("Message"), "Bring a towel.");
    await user.click(screen.getByRole("button", { name: "Post announcement" }));
    expect(api.createAnnouncement).toHaveBeenCalledWith({ title: "Swimming", body: "Bring a towel.", school_class: 3 });
    expect(await screen.findByText("Announcement posted.")).toBeInTheDocument();
    await waitFor(() => expect(api.getAnnouncements).toHaveBeenCalledTimes(2));
  });

  it("offers edit and delete only on the teacher's own posts", async () => {
    render(<AnnouncementManager />);
    expect(await screen.findByRole("button", { name: "Edit: Homework" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit: Half-term" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete: Half-term" })).not.toBeInTheDocument();
  });

  it("edits a post in the form", async () => {
    api.updateAnnouncement.mockResolvedValueOnce(ann({ title: "Homework (updated)" }));
    const user = userEvent.setup();
    render(<AnnouncementManager />);
    await user.click(await screen.findByRole("button", { name: "Edit: Homework" }));
    expect(screen.getByRole("heading", { name: "Edit announcement" })).toBeInTheDocument();
    const title = screen.getByLabelText("Title");
    expect(title).toHaveValue("Homework");
    await user.type(title, " (updated)");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(api.updateAnnouncement).toHaveBeenCalledWith(1, { title: "Homework (updated)", body: "Page 12", school_class: 3 });
    expect(await screen.findByText("Announcement updated.")).toBeInTheDocument();
  });

  it("deletes after confirming, and not without", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    api.deleteAnnouncement.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<AnnouncementManager />);
    const del = await screen.findByRole("button", { name: "Delete: Homework" });
    await user.click(del);
    expect(api.deleteAnnouncement).not.toHaveBeenCalled();
    await user.click(del);
    expect(api.deleteAnnouncement).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Announcement deleted.")).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("shows the server's reason if posting is refused", async () => {
    api.createAnnouncement.mockRejectedValueOnce(new ApiError(403, { detail: "You can only post announcements to classes you teach." }));
    const user = userEvent.setup();
    render(<AnnouncementManager />);
    await user.type(await screen.findByLabelText("Title"), "x");
    await user.type(screen.getByLabelText("Message"), "y");
    await user.click(screen.getByRole("button", { name: "Post announcement" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("only post announcements to classes you teach");
  });
});
