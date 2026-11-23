import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gradeOptions } from "@/content/admissions";
import { ApiError } from "@/lib/api";
import { EnquiryForm } from "./EnquiryForm";

const submitEnquiry = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  submitEnquiry,
}));

beforeEach(() => submitEnquiry.mockReset());

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Parent \/ guardian name/), "Test Parent");
  await user.type(screen.getByLabelText(/Phone number/), "+254 700 000 001");
  await user.type(screen.getByLabelText(/Child's first name/), "Testchild");
  await user.selectOptions(screen.getByLabelText(/Grade applying for/), "grade-3");
}

describe("EnquiryForm", () => {
  it("submits the enquiry and shows a confirmation", async () => {
    submitEnquiry.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<EnquiryForm />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(submitEnquiry).toHaveBeenCalledWith({
      parent_name: "Test Parent",
      phone: "+254 700 000 001",
      email: "",
      child_first_name: "Testchild",
      grade: "grade-3",
      start_term: "",
      message: "",
      website: "",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("we've received your enquiry");
  });

  it("shows field errors returned by the backend", async () => {
    submitEnquiry.mockRejectedValueOnce(new ApiError(400, { phone: ["Enter a valid phone number."] }));
    const user = userEvent.setup();
    render(<EnquiryForm />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("check the highlighted fields");
    const phone = screen.getByLabelText(/Phone number/);
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAccessibleDescription("Enter a valid phone number.");
  });

  it("explains rate limiting", async () => {
    submitEnquiry.mockRejectedValueOnce(new ApiError(429, { detail: "Request was throttled." }));
    const user = userEvent.setup();
    render(<EnquiryForm />);
    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/try again later/);
  });

  it("does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<EnquiryForm />);
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));
    expect(submitEnquiry).not.toHaveBeenCalled();
  });

  it("keeps the honeypot out of the accessibility tree and tab order", () => {
    render(<EnquiryForm />);
    expect(screen.queryByRole("textbox", { name: /leave this field empty/i })).not.toBeInTheDocument();
    const trap = document.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap).toHaveAttribute("tabindex", "-1");
  });
});

describe("grade options", () => {
  it("match the backend Enquiry.Grade choices exactly", () => {
    // Tests run from frontend/, so the backend lives one level up.
    const models = readFileSync(resolve(process.cwd(), "../backend/admissions/models.py"), "utf8");
    const gradeBlock = models.slice(models.indexOf("class Grade"), models.indexOf("class Status"));
    const backendValues = [...gradeBlock.matchAll(/=\s*"([^"]+)",\s*"/g)].map((m) => m[1]);
    expect(gradeOptions.map((g) => g.value)).toEqual(backendValues);
  });
});
