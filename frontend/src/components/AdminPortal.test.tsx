import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type AdminClass, type AdminMedia, type AdminUser, type Announcement, type Term, type User } from "@/lib/api";
import { AdminClasses } from "./AdminClasses";
import { AdminEnquiries } from "./AdminEnquiries";
import { AdminGallery } from "./AdminGallery";
import { AdminOverview } from "./AdminOverview";
import { AdminTerms } from "./AdminTerms";
import { AdminUsers } from "./AdminUsers";
import { AnnouncementManager } from "./AnnouncementManager";

const nav = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/portal/admin",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const me: User = { id: 1, username: "ADMIN-1", first_name: "Adminna", last_name: "Example", email: "", role: "admin" };
vi.mock("./PortalShell", () => ({ usePortalUser: () => me }));

const admin = vi.hoisted(() => ({
  overview: vi.fn(), users: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), resetPassword: vi.fn(),
  classes: vi.fn(), createClass: vi.fn(), updateClass: vi.fn(), deleteClass: vi.fn(),
  assignments: vi.fn(), createAssignment: vi.fn(), deleteAssignment: vi.fn(), subjects: vi.fn(),
  terms: vi.fn(), createTerm: vi.fn(), updateTerm: vi.fn(),
  media: vi.fn(), setMediaApproved: vi.fn(), deleteMedia: vi.fn(),
  enquiries: vi.fn(), setEnquiryStatus: vi.fn(),
}));
const school = vi.hoisted(() => ({ getClasses: vi.fn(), getAnnouncements: vi.fn(), createAnnouncement: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  adminApi: admin,
  ...school,
}));

const CLS: AdminClass = { id: 3, name: "Grade 5 Demo", grade: "grade-5", grade_label: "Grade 5", year: 2026,
  class_teacher: null, class_teacher_name: null, student_count: 2 };
const user = (o: Partial<AdminUser>): AdminUser => ({ id: 20, username: "TEST-A", first_name: "Testa", last_name: "Example",
  email: "", role: "student", is_active: true, school_class: 3, class_name: "Grade 5 Demo", last_login: null,
  date_joined: "2026-01-01T00:00:00Z", date_of_birth: null, guardian_name: "", guardian_phone: "", staff_number: "",
  phone: "", ...o });
const term = (o: Partial<Term>): Term => ({ id: 2, year: 2026, name: "term-2", label: "Term 2 2026", start_date: "2026-04-28",
  end_date: "2026-08-01", is_current: false, results_published: false, ...o });

let confirm: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  nav.search = "";
  confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  admin.classes.mockResolvedValue([CLS]);
});
afterEach(() => {
  confirm.mockRestore();
  [...Object.values(admin), ...Object.values(school)].forEach((fn) => fn.mockReset());
});

describe("Admin overview", () => {
  it("highlights work waiting and links to Django admin for the rest", async () => {
    admin.overview.mockResolvedValue({ students: 120, staff: 14, classes: 9, pending_media: 3, new_enquiries: 0,
      unplaced_students: 2, current_term: term({ is_current: true }) });
    render(<AdminOverview />);
    const pending = (await screen.findByText("Photos & videos awaiting approval")).closest("a")!;
    expect(pending).toHaveAttribute("href", "/portal/admin/gallery");
    expect(pending).toHaveTextContent("3");
    expect(pending).toHaveTextContent("Review");
    expect(screen.getByText("New admissions enquiries").closest("a")).not.toHaveTextContent("Review");
    expect(screen.getByText(/Term 2 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Django admin/ })).toHaveAttribute("href", expect.stringMatching(/\/admin\/$/));
  });
});

describe("Admin users", () => {
  beforeEach(() => admin.users.mockResolvedValue([user({}), user({ id: 1, username: "ADMIN-1", role: "admin", first_name: "Adminna", school_class: null, class_name: null })]));

  it("creates a student in a class and shows the one-time password", async () => {
    admin.createUser.mockResolvedValueOnce({ ...user({ id: 30, username: "ADM-2026-007" }), password: "k7Rm4-Qx9pT" });
    const u = userEvent.setup();
    render(<AdminUsers />);
    await u.click(await screen.findByRole("button", { name: "Add user" }));
    await u.type(screen.getByLabelText("Admission no. / Staff ID"), "ADM-2026-007");
    await u.type(screen.getByLabelText("First name"), "Newa");
    await u.selectOptions(screen.getByLabelText("Class"), "3");
    await u.click(screen.getByRole("button", { name: "Create account" }));
    expect(admin.createUser).toHaveBeenCalledWith({ username: "ADM-2026-007", first_name: "Newa", last_name: "", email: "",
      role: "student", school_class: 3 });
    const panel = await screen.findByRole("alert");
    expect(panel).toHaveTextContent("ADM-2026-007");
    expect(within(panel).getByText("k7Rm4-Qx9pT")).toBeInTheDocument();
    await u.click(within(panel).getByRole("button", { name: "Done" }));
    expect(screen.queryByText("k7Rm4-Qx9pT")).not.toBeInTheDocument();
  });

  it("only offers a class for students", async () => {
    const u = userEvent.setup();
    render(<AdminUsers />);
    await u.click(await screen.findByRole("button", { name: "Add user" }));
    expect(screen.getByLabelText("Class")).toBeInTheDocument();
    await u.selectOptions(screen.getByLabelText("Role"), "staff");
    expect(screen.queryByLabelText("Class")).not.toBeInTheDocument();
  });

  it("shows the server's reason when a username is taken", async () => {
    admin.createUser.mockRejectedValueOnce(new ApiError(400, { username: ["That username is already taken."] }));
    const u = userEvent.setup();
    render(<AdminUsers />);
    await u.click(await screen.findByRole("button", { name: "Add user" }));
    await u.type(screen.getByLabelText("Admission no. / Staff ID"), "TEST-A");
    await u.type(screen.getByLabelText("First name"), "X");
    await u.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already taken");
  });

  it("resets a password after confirming", async () => {
    admin.resetPassword.mockResolvedValueOnce({ password: "Abcde-23456" });
    render(<AdminUsers />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Reset password: Testa Example" }));
    expect(confirm).toHaveBeenCalled();
    expect(admin.resetPassword).toHaveBeenCalledWith(20);
    expect(await screen.findByText("Abcde-23456")).toBeInTheDocument();
  });

  it("does not reset without confirmation", async () => {
    confirm.mockReturnValue(false);
    render(<AdminUsers />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Reset password: Testa Example" }));
    expect(admin.resetPassword).not.toHaveBeenCalled();
  });

  it("moves a student and deactivates them", async () => {
    admin.updateUser.mockResolvedValueOnce(user({}));
    const u = userEvent.setup();
    render(<AdminUsers />);
    await u.click(await screen.findByRole("button", { name: "Edit: Testa Example" }));
    await u.selectOptions(screen.getByLabelText("Class"), "");
    await u.click(screen.getByLabelText("Can sign in"));
    await u.click(screen.getByRole("button", { name: "Save" }));
    expect(admin.updateUser).toHaveBeenCalledWith(20, expect.objectContaining({ school_class: null, is_active: false }));
  });

  it("never sends is_active when admins edit themselves", async () => {
    admin.updateUser.mockResolvedValueOnce(user({ id: 1 }));
    const u = userEvent.setup();
    render(<AdminUsers />);
    await u.click(await screen.findByRole("button", { name: "Edit: Adminna Example" }));
    expect(screen.getByLabelText("Can sign in")).toBeDisabled();
    await u.click(screen.getByRole("button", { name: "Save" }));
    expect(admin.updateUser.mock.calls[0][1]).not.toHaveProperty("is_active");
  });

  it("filters by role from the URL and by search", async () => {
    nav.search = "role=staff";
    const u = userEvent.setup();
    render(<AdminUsers />);
    await waitFor(() => expect(admin.users).toHaveBeenCalledWith({ role: "staff", q: "" }));
    await u.type(screen.getByLabelText("Search by name or ID"), "tutor{Enter}");
    await waitFor(() => expect(admin.users).toHaveBeenLastCalledWith({ role: "staff", q: "tutor" }));
  });
});

describe("Admin classes", () => {
  beforeEach(() => {
    admin.users.mockResolvedValue([user({ id: 7, username: "T1", role: "staff", first_name: "Tutor", school_class: null })]);
    admin.subjects.mockResolvedValue([{ id: 1, name: "Mathematics", code: "maths" }]);
    admin.assignments.mockResolvedValue([]);
  });

  it("creates a class with a class teacher", async () => {
    admin.createClass.mockResolvedValueOnce(CLS);
    const u = userEvent.setup();
    render(<AdminClasses />);
    await u.type(await screen.findByLabelText("Class name"), "Grade 4 Blue");
    await u.selectOptions(screen.getByLabelText("Grade"), "grade-4");
    await u.selectOptions(screen.getByLabelText("Class teacher"), "7");
    await u.click(screen.getByRole("button", { name: "Add class" }));
    expect(admin.createClass).toHaveBeenCalledWith(expect.objectContaining({ name: "Grade 4 Blue", grade: "grade-4", class_teacher: 7 }));
  });

  it("assigns a teacher to a subject and removes assignments", async () => {
    admin.createAssignment.mockResolvedValueOnce({});
    const u = userEvent.setup();
    render(<AdminClasses />);
    await u.click(await screen.findByRole("button", { name: "Manage: Grade 5 Demo" }));
    expect(await screen.findByText("No teachers assigned yet.")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Assign" }));
    expect(admin.createAssignment).toHaveBeenCalledWith({ teacher: 7, school_class: 3, subject: 1 });

    admin.assignments.mockResolvedValue([{ id: 9, teacher: 7, teacher_name: "Tutor", school_class: 3, class_name: "Grade 5 Demo",
      subject: 1, subject_name: "Mathematics" }]);
    admin.deleteAssignment.mockResolvedValueOnce(null);
    await u.click(screen.getByRole("button", { name: "Close: Grade 5 Demo" }));
    await u.click(screen.getByRole("button", { name: "Manage: Grade 5 Demo" }));
    await u.click(await screen.findByRole("button", { name: "Remove: Mathematics, Tutor" }));
    expect(admin.deleteAssignment).toHaveBeenCalledWith(9);
  });
});

describe("Admin terms", () => {
  it("publishes results only after confirming, and sets the current term", async () => {
    admin.terms.mockResolvedValue([term({ id: 3, label: "Term 3 2026", is_current: true }), term({})]);
    admin.updateTerm.mockResolvedValue(term({}));
    const u = userEvent.setup();
    render(<AdminTerms />);
    await u.click(await screen.findByRole("button", { name: "Publish results: Term 2 2026" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Students will see them"));
    expect(admin.updateTerm).toHaveBeenCalledWith(2, { results_published: true });
    await u.click(screen.getByRole("button", { name: "Set as current: Term 2 2026" }));
    expect(admin.updateTerm).toHaveBeenCalledWith(2, { is_current: true });
    expect(screen.queryByRole("button", { name: "Set as current: Term 3 2026" })).not.toBeInTheDocument();
  });

  it("creates a term", async () => {
    admin.terms.mockResolvedValue([]);
    admin.createTerm.mockResolvedValueOnce(term({}));
    const u = userEvent.setup();
    render(<AdminTerms />);
    await u.type(await screen.findByLabelText("Starts"), "2027-01-05");
    await u.type(screen.getByLabelText("Ends"), "2027-04-02");
    await u.click(screen.getByLabelText("Make this the current term"));
    await u.click(screen.getByRole("button", { name: "Add term" }));
    expect(admin.createTerm).toHaveBeenCalledWith(expect.objectContaining({ name: "term-1", start_date: "2027-01-05",
      end_date: "2027-04-02", is_current: true }));
  });
});

describe("Admin gallery", () => {
  const item = (o: Partial<AdminMedia>): AdminMedia => ({ id: 5, kind: "photo", title: "Sports day", caption: "",
    alt_text: "Children racing", url: "https://res.cloudinary.com/demo/image/upload/a.jpg", poster_url: "", youtube_id: null,
    is_approved: false, approved_by_name: null, approved_at: null, created_at: "2026-11-20T07:00:00Z", ...o });

  it("approves pending media and can show approved items", async () => {
    admin.media.mockResolvedValue([item({})]);
    admin.setMediaApproved.mockResolvedValueOnce(item({ is_approved: true }));
    const u = userEvent.setup();
    render(<AdminGallery />);
    expect(admin.media).toHaveBeenCalledWith("pending");
    expect(await screen.findByRole("img", { name: "Children racing" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Approve: Sports day" }));
    expect(admin.setMediaApproved).toHaveBeenCalledWith(5, true);

    admin.media.mockResolvedValue([item({ is_approved: true, approved_by_name: "Adminna" })]);
    await u.click(screen.getByRole("tab", { name: "Approved" }));
    expect(admin.media).toHaveBeenLastCalledWith("approved");
    await u.click(await screen.findByRole("button", { name: "Hide: Sports day" }));
    expect(admin.setMediaApproved).toHaveBeenCalledWith(5, false);
  });
});

describe("Admin enquiries", () => {
  it("lists new enquiries and updates status", async () => {
    admin.enquiries.mockResolvedValue([{ id: 4, parent_name: "Test Parent", phone: "+254 700 000 001", email: "p@example.com",
      child_first_name: "Kiddo", grade: "pp1", grade_label: "Pre-Primary 1", start_term: "", message: "Can we visit?",
      status: "new", created_at: "2026-11-20T07:00:00Z" }]);
    admin.setEnquiryStatus.mockResolvedValueOnce({});
    render(<AdminEnquiries />);
    expect(admin.enquiries).toHaveBeenCalledWith("new");
    expect(await screen.findByRole("link", { name: "+254 700 000 001" })).toHaveAttribute("href", "tel:+254700000001");
    await userEvent.setup().selectOptions(screen.getByLabelText("Status: Test Parent"), "contacted");
    expect(admin.setEnquiryStatus).toHaveBeenCalledWith(4, "contacted");
    expect(await screen.findByText(/Status updated/)).toBeInTheDocument();
  });
});

describe("Admin announcements", () => {
  const ann = (o: Partial<Announcement>): Announcement => ({ id: 1, title: "Staff notice", body: "b", school_class: 3,
    class_name: "Grade 5 Demo", author_name: "Tutor", is_mine: false, published_at: "2026-11-20T07:00:00Z",
    updated_at: "2026-11-20T07:00:00Z", ...o });

  it("posts school-wide by default and can manage everyone's posts", async () => {
    school.getClasses.mockResolvedValue([{ ...CLS, section: "primary", students: [], my_subjects: [] }]);
    school.getAnnouncements.mockResolvedValue([ann({})]);
    school.createAnnouncement.mockResolvedValueOnce(ann({ id: 2 }));
    const u = userEvent.setup();
    render(<AnnouncementManager schoolWide manageAll />);
    expect(await screen.findByRole("button", { name: "Edit: Staff notice" })).toBeInTheDocument();
    expect(screen.getByLabelText("Class")).toHaveValue("");
    await u.type(screen.getByLabelText("Title"), "Closing day");
    await u.type(screen.getByLabelText("Message"), "Friday 12:30.");
    await u.click(screen.getByRole("button", { name: "Post announcement" }));
    expect(school.createAnnouncement).toHaveBeenCalledWith({ title: "Closing day", body: "Friday 12:30.", school_class: null });
  });
});
