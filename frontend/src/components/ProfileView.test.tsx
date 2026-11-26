import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type SchoolProfile } from "@/lib/api";
import { expectNoA11yViolations } from "@/test/axe";
import { ProfileView } from "./ProfileView";

const api = vi.hoisted(() => ({ getSchoolProfile: vi.fn(), changePassword: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), ...api }));

const STUDENT: SchoolProfile = {
  id: 1, username: "TEST-A", name: "Testa Example", role: "student", first_name: "Testa", last_name: "Example", email: "",
  school_class: { id: 1, name: "Grade 5 Demo", grade: "grade-5", grade_label: "Grade 5", section: "primary", year: 2026,
                  class_teacher_name: "Tutor Example" },
  details: { date_of_birth: "2016-03-09", guardian_name: "Guardian Example", guardian_phone: "0700 000 001" },
};
const STAFF: SchoolProfile = {
  id: 9, username: "STAFF-T", name: "Tutor Example", role: "staff", email: "tutor@example.invalid",
  assignments: [
    { id: 1, school_class: 1, class_name: "Grade 5 Demo", subject: 1, subject_name: "Mathematics" },
    { id: 2, school_class: 1, class_name: "Grade 5 Demo", subject: 2, subject_name: "Science" },
    { id: 3, school_class: 2, class_name: "Grade 8 Demo", subject: 1, subject_name: "Mathematics" },
  ],
  class_teacher_of: [{ id: 1, name: "Grade 5 Demo" }],
  details: { staff_number: "TSC-0001", phone: "" },
};

const row = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling as HTMLElement;

beforeEach(() => {
  api.getSchoolProfile.mockReset();
  api.changePassword.mockReset();
});

describe("ProfileView", () => {
  it("shows a pupil's own details, class and guardian, with no edit controls", async () => {
    api.getSchoolProfile.mockResolvedValue(STUDENT);
    render(<ProfileView />);
    expect(await screen.findByText("Testa Example")).toBeInTheDocument();
    expect(row("Admission no.")).toHaveTextContent("TEST-A");
    expect(row("Date of birth")).toHaveTextContent("9 March 2016");
    expect(row("Class")).toHaveTextContent("Grade 5 Demo");
    expect(row("Section")).toHaveTextContent("Primary");
    expect(row("Class teacher")).toHaveTextContent("Tutor Example");
    expect(row("Phone")).toHaveTextContent("0700 000 001");
    expect(screen.getByRole("note")).toHaveTextContent("Only the school office can change these details");
    // The only form on the page is the password change: no editable text fields for details.
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Change password"]);
    expect(screen.queryByText("Staff number (TSC)")).not.toBeInTheDocument();
  });

  it("says 'Not recorded' for missing details and handles no class", async () => {
    api.getSchoolProfile.mockResolvedValue({ ...STUDENT, school_class: null,
      details: { date_of_birth: null, guardian_name: "", guardian_phone: "" } });
    render(<ProfileView />);
    expect(await screen.findByText(/haven't been placed in a class/)).toBeInTheDocument();
    expect(row("Date of birth")).toHaveTextContent("Not recorded");
    expect(row("Name")).toHaveTextContent("Not recorded");
  });

  it("shows staff details and what they teach, grouped by class", async () => {
    api.getSchoolProfile.mockResolvedValue(STAFF);
    render(<ProfileView />);
    expect(await screen.findByText("Tutor Example")).toBeInTheDocument();
    expect(row("Staff ID")).toHaveTextContent("STAFF-T");
    expect(row("Staff number (TSC)")).toHaveTextContent("TSC-0001");
    expect(row("Phone")).toHaveTextContent("Not recorded");
    const teaching = screen.getByRole("region", { name: "What I teach" });
    expect(within(teaching).getByText(/Class teacher of/).parentElement).toHaveTextContent("Grade 5 Demo");
    const g5 = within(teaching).getByRole("heading", { name: "Grade 5 Demo" }).parentElement!;
    expect(g5).toHaveTextContent("Mathematics, Science");
    expect(within(teaching).getByRole("heading", { name: "Grade 8 Demo" })).toBeInTheDocument();
    expect(screen.queryByText("Date of birth")).not.toBeInTheDocument();
  });

  it("tells staff with no assignments to ask an administrator", async () => {
    api.getSchoolProfile.mockResolvedValue({ ...STAFF, assignments: [], class_teacher_of: [] });
    render(<ProfileView />);
    expect(await screen.findByText(/haven't been assigned any classes/)).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    api.getSchoolProfile.mockResolvedValue(STAFF);
    const { container } = render(<ProfileView />);
    await screen.findByText("Tutor Example");
    await expectNoA11yViolations(container);
  });
});

describe("ChangePasswordForm (inside ProfileView)", () => {
  async function setup() {
    api.getSchoolProfile.mockResolvedValue(STUDENT);
    const u = userEvent.setup();
    render(<ProfileView />);
    await screen.findByText("Testa Example");
    const fill = async (current: string, next: string, confirm = next) => {
      if (current) await u.type(screen.getByLabelText("Current password"), current);
      if (next) await u.type(screen.getByLabelText("New password"), next);
      if (confirm) await u.type(screen.getByLabelText("Type the new password again"), confirm);
      await u.click(screen.getByRole("button", { name: "Change password" }));
    };
    return { u, fill };
  }

  it("is a POST form so passwords never land in the URL", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Change password" }).closest("form")).toHaveAttribute("method", "post");
  });

  it("changes the password and clears the fields", async () => {
    api.changePassword.mockResolvedValueOnce({ detail: "Password changed." });
    const { fill } = await setup();
    await fill("old-pass-1", "Blue-Heron-Valley-42");
    expect(api.changePassword).toHaveBeenCalledWith({ current_password: "old-pass-1", new_password: "Blue-Heron-Valley-42" });
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it.each([
    ["", "Blue-Heron-Valley-42", undefined, "Current password", "Enter your current password."],
    ["old", "short", undefined, "New password", "at least 8 characters"],
    ["old", "Blue-Heron-Valley-42", "Blue-Heron-Valley-43", "Type the new password again", "don't match"],
  ])("checks before sending (current=%j new=%j)", async (current, next, confirm, field, message) => {
    const { fill } = await setup();
    await fill(current, next, confirm ?? next);
    expect(api.changePassword).not.toHaveBeenCalled();
    const input = screen.getByLabelText(field);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)).toHaveTextContent(message);
  });

  it("puts the server's reasons on the right fields", async () => {
    api.changePassword.mockRejectedValueOnce(new ApiError(400, {
      current_password: ["That isn't your current password."],
      new_password: ["This password is too common."],
    }));
    const { fill } = await setup();
    await fill("wrong", "password123");
    const current = screen.getByLabelText("Current password");
    expect(current).toHaveAttribute("aria-invalid", "true");
    expect(await screen.findByText("That isn't your current password.")).toBeInTheDocument();
    expect(screen.getByText("This password is too common.")).toBeInTheDocument();
    expect(current).toHaveValue("wrong"); // nothing typed is lost
  });

  it("explains throttling and network failures", async () => {
    api.changePassword.mockRejectedValueOnce(new ApiError(429, { detail: "Request was throttled. Expected available in 30 seconds." }));
    const { fill } = await setup();
    await fill("old-pass-1", "Blue-Heron-Valley-42");
    expect(await screen.findByRole("status")).toHaveTextContent(/throttled/);
  });
});
