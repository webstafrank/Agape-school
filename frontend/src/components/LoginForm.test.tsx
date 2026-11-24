import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { LoginForm } from "./LoginForm";

// Next's router object is stable across renders; the mock must be too.
const nav = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, router: { replace }, search: "" };
});
vi.mock("next/navigation", () => ({
  useRouter: () => nav.router,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const api = vi.hoisted(() => ({ login: vi.fn(), getMe: vi.fn(), isLoggedIn: vi.fn(), logout: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

beforeEach(() => {
  nav.replace.mockReset();
  nav.search = "";
  Object.values(api).forEach((fn) => fn.mockReset());
  api.isLoggedIn.mockReturnValue(false);
});

async function signIn(username = "ADM001", password = "pw") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Admission no. / Staff ID"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it.each([
    ["student", "/portal/student"],
    ["staff", "/portal/staff"],
    ["admin", "/portal/admin"],
  ])("sends a %s to %s", async (role, path) => {
    api.login.mockResolvedValueOnce(role);
    render(<LoginForm />);
    await signIn(" ADM001 ", "secret");
    expect(api.login).toHaveBeenCalledWith("ADM001", "secret");
    expect(nav.replace).toHaveBeenCalledWith(path);
  });

  it("returns to the requested page inside the user's own portal", async () => {
    nav.search = "next=%2Fportal%2Fstudent%2Fresults";
    api.login.mockResolvedValueOnce("student");
    render(<LoginForm />);
    await signIn();
    expect(nav.replace).toHaveBeenCalledWith("/portal/student/results");
  });

  it("ignores a next path that points at another role's portal", async () => {
    nav.search = "next=%2Fportal%2Fadmin";
    api.login.mockResolvedValueOnce("student");
    render(<LoginForm />);
    await signIn();
    expect(nav.replace).toHaveBeenCalledWith("/portal/student");
  });

  it.each([
    [new ApiError(401, {}), "don't match"],
    [new ApiError(429, {}), "Too many sign-in attempts"],
    [new TypeError("fetch failed"), "couldn't reach the school server"],
  ])("shows a helpful error (%s)", async (err, message) => {
    api.login.mockRejectedValueOnce(err);
    render(<LoginForm />);
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(nav.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("skips the form for someone already signed in", async () => {
    api.isLoggedIn.mockReturnValue(true);
    api.getMe.mockResolvedValueOnce({ id: 1, username: "T1", first_name: "", last_name: "", email: "", role: "staff" });
    render(<LoginForm />);
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/portal/staff"));
  });

  it("explains why when sent back after a session expires", () => {
    nav.search = "reason=expired";
    render(<LoginForm />);
    expect(screen.getByRole("status")).toHaveTextContent("Your session has ended");
  });

  it("tells people who forgot their password to contact the office", () => {
    render(<LoginForm />);
    expect(screen.getByText(/contact the school office/)).toBeInTheDocument();
  });
});
