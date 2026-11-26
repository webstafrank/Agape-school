import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiErrors } from "@/content/errors";
import { ApiError, type GridResult, type ResultGrid as Grid, type Term } from "@/lib/api";
import { expectNoA11yViolations } from "@/test/axe";
import { ResultsGrid } from "./ResultsGrid";
import { StaffResults } from "./StaffResults";

const nav = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, router: { replace }, search: "" };
});
vi.mock("next/navigation", () => ({
  usePathname: () => "/portal/staff/results",
  useRouter: () => nav.router,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const api = vi.hoisted(() => ({
  saveResultGrid: vi.fn(),
  getResultGrid: vi.fn(),
  getSchoolProfile: vi.fn(),
  getTerms: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), ...api }));

const TERM: Term = {
  id: 2, year: 2026, name: "term-2", label: "Term 2 2026", start_date: "2026-04-28", end_date: "2026-08-01",
  is_current: true, results_published: false,
};
const cell = (student: number, subject: number, score: string, level = "ME", level_label = "Meeting Expectations"): GridResult => ({
  student, subject, score, level, level_label, comment: "",
});
const grid = (o: Partial<Grid> = {}): Grid => ({
  school_class: { id: 3, name: "Grade 5 Demo", grade: "grade-5", section: "primary" },
  term: TERM,
  locked: false,
  subjects: [
    { id: 1, name: "Mathematics", code: "maths" },
    { id: 2, name: "English", code: "eng" },
  ],
  students: [
    { id: 11, username: "TEST-A", name: "Testa Example" },
    { id: 12, username: "TEST-B", name: "Testo Example" },
    { id: 13, username: "TEST-C", name: "Testi Example" },
  ],
  results: [
    cell(11, 1, "64.00"),
    cell(11, 2, "77.50", "EE", "Exceeding Expectations"),
    cell(13, 1, "30.00", "AE", "Approaching Expectations"),
  ],
  ...o,
});

const box = (subject: string, student: string) => screen.getByLabelText(`${subject} score for ${student}`) as HTMLInputElement;
const description = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
const averageOf = (student: string) => within(screen.getByRole("row", { name: new RegExp(student) })).getAllByRole("cell").at(-1)!;
const saveButton = () => screen.getByRole("button", { name: "Save table" });

beforeEach(() => {
  nav.replace.mockReset();
  nav.search = "";
});
afterEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  vi.restoreAllMocks();
});

describe("ResultsGrid", () => {
  it("renders a labelled table: subjects across, students down, saved scores with levels", () => {
    render(<ResultsGrid grid={grid()} />);
    const table = screen.getByRole("table", { name: "Grade 5 Demo · Term 2 2026" });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.firstChild?.textContent)).toEqual(["Student", "Mathematics", "English", "Average"]);
    headers.forEach((h) => expect(h).toHaveAttribute("scope", "col"));
    const rowHeaders = within(table).getAllByRole("rowheader");
    expect(rowHeaders.map((h) => h.getAttribute("scope"))).toEqual(["row", "row", "row", "row"]);
    expect(rowHeaders[0]).toHaveTextContent("Testa Example");
    expect(rowHeaders[3]).toHaveTextContent("Class average");

    const maths = box("Mathematics", "Testa Example");
    expect(maths).toHaveValue("64");
    expect(maths).toHaveAttribute("inputmode", "decimal");
    expect(box("English", "Testa Example")).toHaveValue("77.5");
    expect(box("English", "Testo Example")).toHaveValue("");
    expect(within(maths.closest("td")!).getByText("ME")).toBeInTheDocument();
    expect(within(box("English", "Testa Example").closest("td")!).getByText("EE")).toBeInTheDocument();
    expect(screen.getByText("2/3 entered")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No unsaved changes.");
  });

  it("works out student and class averages to 1 decimal place, blank when nothing is entered", async () => {
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    expect(averageOf("Testa Example")).toHaveTextContent(/^70\.8$/); // (64 + 77.5) / 2 = 70.75
    expect(averageOf("Testo Example")).toHaveTextContent(/^$/);
    expect(averageOf("Testi Example")).toHaveTextContent(/^30\.0$/);
    const foot = within(screen.getByRole("row", { name: /Class average/ })).getAllByRole("cell");
    expect(foot.map((c) => c.textContent)).toEqual(["47.0", "77.5", "57.2"]);

    // Live while typing; an invalid score doesn't count.
    await user.type(box("Mathematics", "Testo Example"), "81");
    await user.type(box("English", "Testo Example"), "500");
    expect(averageOf("Testo Example")).toHaveTextContent(/^81\.0$/);
    expect(foot[0]).toHaveTextContent("58.3"); // (64 + 81 + 30) / 3
  });

  it("moves down a column with Enter, then on to the next subject, without submitting", async () => {
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    act(() => box("Mathematics", "Testo Example").focus());
    await user.keyboard("55{Enter}");
    expect(box("Mathematics", "Testi Example")).toHaveFocus();
    // Last row: Enter goes to the top of the next subject, never submits.
    await user.keyboard("{Enter}");
    expect(box("English", "Testa Example")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(box("English", "Testo Example")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(box("English", "Testa Example")).toHaveFocus();
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(box("English", "Testa Example")).toHaveFocus();
    act(() => box("English", "Testi Example").focus());
    await user.keyboard("{Enter}");
    expect(saveButton()).toHaveFocus();
    expect(api.saveResultGrid).not.toHaveBeenCalled();
    expect(box("Mathematics", "Testo Example")).toHaveValue("55");
  });

  it("moves left/right only from the edge of the text, and Tab goes across the row", async () => {
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    const english = box("English", "Testa Example");
    act(() => english.focus());
    english.setSelectionRange(2, 2); // caret inside "77.5"
    await user.keyboard("{ArrowLeft}");
    expect(english).toHaveFocus();
    english.setSelectionRange(0, 0);
    await user.keyboard("{ArrowLeft}");
    expect(box("Mathematics", "Testa Example")).toHaveFocus();
    // Focusing a cell selects its score, so arrowing straight across works.
    await user.keyboard("{ArrowRight}");
    expect(english).toHaveFocus();
    // Empty cells: arrows always move.
    act(() => box("Mathematics", "Testo Example").focus());
    await user.keyboard("{ArrowRight}");
    expect(box("English", "Testo Example")).toHaveFocus();

    act(() => box("Mathematics", "Testa Example").focus());
    await user.tab();
    expect(english).toHaveFocus();
    await user.tab();
    expect(box("Mathematics", "Testo Example")).toHaveFocus();
  });

  it("sends only the changed cells, blank as null, and shows the fresh levels", async () => {
    api.saveResultGrid.mockResolvedValueOnce(
      grid({ results: [cell(11, 1, "64.00"), cell(12, 1, "55.00", "AE", "Approaching Expectations"), cell(13, 1, "30.00", "AE", "Approaching Expectations")] }),
    );
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    await user.click(saveButton());
    expect(saveButton()).toHaveAttribute("aria-disabled", "true");
    expect(api.saveResultGrid).not.toHaveBeenCalled();

    await user.type(box("Mathematics", "Testo Example"), "55");
    await user.clear(box("English", "Testa Example"));
    // Re-typing a saved score in another form is not a change.
    await user.clear(box("Mathematics", "Testi Example"));
    await user.type(box("Mathematics", "Testi Example"), "30.0");

    expect(screen.getByRole("status")).toHaveTextContent("2 unsaved changes.");
    // Changed cells say so in words, not just colour.
    expect(description(box("Mathematics", "Testo Example"))).toContain("Unsaved");
    expect(box("Mathematics", "Testi Example")).not.toHaveAttribute("aria-describedby");

    await user.click(saveButton());
    expect(api.saveResultGrid).toHaveBeenCalledWith({
      school_class: 3,
      term: 2,
      cells: [
        { student: 11, subject: 2, score: null },
        { student: 12, subject: 1, score: 55 },
      ],
    });
    expect(await screen.findByText("Saved 2 scores. Everything is up to date.")).toBeInTheDocument();
    expect(saveButton()).toHaveFocus();
    expect(box("English", "Testa Example")).toHaveValue("");
    expect(within(box("Mathematics", "Testo Example").closest("td")!).getByText("AE")).toBeInTheDocument();
    expect(box("Mathematics", "Testo Example")).not.toHaveAttribute("aria-describedby");
    expect(saveButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("saves with Ctrl+S and keeps focus in the cell; Esc undoes a cell", async () => {
    api.saveResultGrid.mockResolvedValueOnce(grid({ results: [...grid().results, cell(12, 1, "90.00", "EE", "Exceeding Expectations")] }));
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    await user.type(box("English", "Testo Example"), "12");
    await user.keyboard("{Escape}");
    expect(box("English", "Testo Example")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("No unsaved changes.");

    await user.type(box("Mathematics", "Testo Example"), "90");
    await user.keyboard("{Control>}s{/Control}");
    expect(api.saveResultGrid).toHaveBeenCalledWith({ school_class: 3, term: 2, cells: [{ student: 12, subject: 1, score: 90 }] });
    expect(await screen.findByText(/Saved 1 score\./)).toBeInTheDocument();
    expect(box("Mathematics", "Testo Example")).toHaveFocus();
  });

  it("checks scores are 0-100 before sending and explains each bad cell", async () => {
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    await user.type(box("Mathematics", "Testo Example"), "120");
    await user.type(box("English", "Testo Example"), "abc");
    await user.type(box("English", "Testi Example"), "45.5"); // decimals are fine

    const maths = box("Mathematics", "Testo Example");
    expect(maths).toHaveAttribute("aria-invalid", "true");
    expect(description(maths)).toContain("Enter a number from 0 to 100.");
    expect(box("English", "Testo Example")).toHaveAttribute("aria-invalid", "true");
    expect(box("English", "Testi Example")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("status")).toHaveTextContent("2 scores need fixing before you can save.");
    expect(screen.getByRole("button", { name: "Mathematics score for Testo Example" })).toBeInTheDocument();

    await user.click(saveButton());
    expect(api.saveResultGrid).not.toHaveBeenCalled();
    expect(maths).toHaveFocus();
  });

  it("maps server cell errors back to the right cells", async () => {
    api.saveResultGrid.mockRejectedValueOnce(new ApiError(400, { cells: [{}, { subject: ["You don't teach English in this class."] }] }));
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    await user.type(box("Mathematics", "Testo Example"), "50");
    await user.type(box("English", "Testo Example"), "60");
    await user.click(saveButton());

    const english = box("English", "Testo Example");
    await waitFor(() => expect(english).toHaveAttribute("aria-invalid", "true"));
    expect(description(english)).toContain("You don't teach English in this class.");
    expect(box("Mathematics", "Testo Example")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("status")).toHaveTextContent("1 score needs fixing");
    expect(english).toHaveValue("60");

    // Editing the cell clears its server error.
    await user.type(english, "5");
    expect(english).not.toHaveAttribute("aria-invalid");
  });

  it("keeps every typed score when the session has ended or the network is down", async () => {
    api.saveResultGrid.mockRejectedValueOnce(new ApiError(401, { detail: "Token is invalid" }));
    api.saveResultGrid.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    await user.type(box("Mathematics", "Testo Example"), "88");
    await user.clear(box("English", "Testa Example"));
    await user.click(saveButton());

    expect(await screen.findByRole("status")).toHaveTextContent("Your session has ended");
    expect(box("Mathematics", "Testo Example")).toHaveValue("88");
    expect(box("English", "Testa Example")).toHaveValue("");
    expect(saveButton()).toHaveAttribute("aria-disabled", "false");

    await user.click(saveButton());
    expect(await screen.findByText(apiErrors.offline)).toBeInTheDocument();
    expect(box("Mathematics", "Testo Example")).toHaveValue("88");
    expect(api.saveResultGrid).toHaveBeenCalledTimes(2);
  });

  it("warns before leaving the page with unsaved scores", async () => {
    const user = userEvent.setup();
    render(<ResultsGrid grid={grid()} />);
    const before = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);
    await user.type(box("Mathematics", "Testo Example"), "70");
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(true);
  });

  it("is read-only with a note and no Save button when the term is locked", () => {
    render(<ResultsGrid grid={grid({ locked: true, term: { ...TERM, results_published: true } })} />);
    expect(screen.getByRole("note")).toHaveTextContent("read-only");
    expect(box("Mathematics", "Testa Example")).toHaveAttribute("readonly");
    expect(box("English", "Testo Example")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Save table" })).not.toBeInTheDocument();
    expect(within(box("Mathematics", "Testa Example").closest("td")!).getByText("ME")).toBeInTheDocument();
  });

  it("has no axe violations, including with changed and invalid cells", async () => {
    const user = userEvent.setup();
    const { container } = render(<ResultsGrid grid={grid()} />);
    await expectNoA11yViolations(container);
    await user.type(box("Mathematics", "Testo Example"), "70");
    await user.type(box("English", "Testo Example"), "700");
    await expectNoA11yViolations(container);
  });
});

describe("StaffResults table view", () => {
  beforeEach(() => {
    api.getSchoolProfile.mockResolvedValue({
      id: 7, username: "STAFF-T", name: "Tutor", role: "staff",
      assignments: [
        { id: 1, school_class: 3, class_name: "Grade 5 Demo", subject: 1, subject_name: "Mathematics" },
        { id: 2, school_class: 3, class_name: "Grade 5 Demo", subject: 2, subject_name: "English" },
        { id: 3, school_class: 4, class_name: "Grade 6 Demo", subject: 1, subject_name: "Mathematics" },
      ],
    });
    api.getTerms.mockResolvedValue([{ ...TERM, id: 3, label: "Term 3 2026", is_current: false }, TERM]);
    api.getResultGrid.mockResolvedValue(grid());
  });

  it("follows class and term in the URL", async () => {
    nav.search = "view=table&class=3&term=3";
    render(<StaffResults />);
    await screen.findByRole("table");
    expect(api.getResultGrid).toHaveBeenCalledWith(3, 3);
    await userEvent.setup().selectOptions(screen.getByLabelText("Class"), "4");
    expect(nav.replace).toHaveBeenCalledWith("/portal/staff/results?view=table&class=4&term=3");
  });

  it("asks before switching class, term or view with unsaved scores", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(<StaffResults />);
    await user.type(await screen.findByLabelText("Mathematics score for Testo Example"), "70");

    await user.selectOptions(screen.getByLabelText("Term"), "3");
    expect(confirm).toHaveBeenCalledWith("You have unsaved scores in this table. Leave without saving them?");
    expect(nav.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Mathematics score for Testo Example")).toHaveValue("70");

    await user.click(screen.getByRole("button", { name: "Comments by subject" }));
    expect(nav.replace).toHaveBeenCalledWith("/portal/staff/results?view=comments&class=3&subject=1&term=2");
  });

  it("switches without asking when nothing is unsaved", async () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<StaffResults />);
    await screen.findByRole("table");
    await userEvent.setup().selectOptions(screen.getByLabelText("Term"), "3");
    expect(confirm).not.toHaveBeenCalled();
    expect(nav.replace).toHaveBeenCalledWith("/portal/staff/results?view=table&class=3&term=3");
  });
});
