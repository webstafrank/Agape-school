import { describe, expect, it } from "vitest";
import { afterLoginPath, portalPath } from "./portal";

describe("portal routing", () => {
  it("maps each role to its portal", () => {
    expect(portalPath("student")).toBe("/portal/student");
    expect(portalPath("staff")).toBe("/portal/staff");
    expect(portalPath("admin")).toBe("/portal/admin");
  });

  it("honours next only inside the user's own portal", () => {
    expect(afterLoginPath("student", "/portal/student/results")).toBe("/portal/student/results");
    expect(afterLoginPath("student", "/portal/student")).toBe("/portal/student");
    expect(afterLoginPath("student", null)).toBe("/portal/student");
    // Another role's portal, look-alike prefixes, and open redirects are ignored.
    expect(afterLoginPath("student", "/portal/admin")).toBe("/portal/student");
    expect(afterLoginPath("student", "/portal/studentX")).toBe("/portal/student");
    expect(afterLoginPath("staff", "//evil.example/portal/staff")).toBe("/portal/staff");
    expect(afterLoginPath("staff", "https://evil.example")).toBe("/portal/staff");
  });
});
