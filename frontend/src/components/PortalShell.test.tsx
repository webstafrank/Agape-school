import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type User } from "@/lib/api";
import { PortalDashboard } from "./PortalDashboard";
import { PortalShell } from "./PortalShell";

// Next's router object is stable across renders; the mock must be too.
const nav = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, router: { replace }, pathname: "/portal/student" };
});
vi.mock("next/navigation", () => ({
  useRouter: () => nav.router,
  usePathname: () => nav.pathname,
}));

const api = vi.hoisted(() => ({ getMe: vi.fn(), isLoggedIn: vi.fn(), logout: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  ...api,
}));

const student: User = { id: 1, username: "ADM001", first_name: "Testa", last_name: "Pupil", email: "", role: "student" };

beforeEach(() => {
  nav.replace.mockReset();
  nav.pathname = "/portal/student";
  Object.values(api).forEach((fn) => fn.mockReset());
  api.isLoggedIn.mockReturnValue(true);
});

function renderStudentPortal() {
  return render(
    <PortalShell role="student">
      <PortalDashboard role="student" />
    </PortalShell>,
  );
}

describe("PortalShell", () => {
  it("redirects signed-out visitors to login and remembers where they were going", async () => {
    api.isLoggedIn.mockReturnValue(false);
    renderStudentPortal();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login?next=%2Fportal%2Fstudent"));
    expect(api.getMe).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: /Welcome/ })).not.toBeInTheDocument();
  });

  it("shows the dashboard to a user with the matching role", async () => {
    api.getMe.mockResolvedValueOnce(student);
    renderStudentPortal();
    expect(await screen.findByRole("heading", { level: 1, name: "Welcome, Testa" })).toBeInTheDocument();
    expect(screen.getByText("Testa Pupil")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it.each(["staff", "admin"] as const)("sends a %s away from the student portal to their own", async (role) => {
    api.getMe.mockResolvedValueOnce({ ...student, role });
    renderStudentPortal();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(`/portal/${role}`));
    expect(screen.queryByRole("heading", { name: /Welcome/ })).not.toBeInTheDocument();
  });

  it("signs out and asks to log in again when the session has expired", async () => {
    api.getMe.mockRejectedValueOnce(new ApiError(401, {}));
    renderStudentPortal();
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith("/login?next=%2Fportal%2Fstudent&reason=expired"),
    );
    expect(api.logout).toHaveBeenCalled();
  });

  it("offers a retry if the server can't be reached", async () => {
    api.getMe.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(student);
    renderStudentPortal();
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach the school server");
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Welcome, Testa" })).toBeInTheDocument();
  });

  it("logs out", async () => {
    api.getMe.mockResolvedValueOnce(student);
    renderStudentPortal();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Log out" }));
    expect(api.logout).toHaveBeenCalled();
    expect(nav.replace).toHaveBeenCalledWith("/login");
  });

  it("links admins to the Django admin until the admin tools exist", async () => {
    nav.pathname = "/portal/admin";
    api.getMe.mockResolvedValueOnce({ ...student, role: "admin" });
    render(
      <PortalShell role="admin">
        <PortalDashboard role="admin" />
      </PortalShell>,
    );
    expect(await screen.findByRole("link", { name: /Open Django admin/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/admin\/$/),
    );
  });
});
