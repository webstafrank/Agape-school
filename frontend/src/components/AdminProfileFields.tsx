import { adminPortal } from "@/content/portal";
import { site } from "@/content/site";
import { PHONE_PATTERN, type AdminUser, type AdminUserInput, type Role } from "@/lib/api";
import { fieldClass, labelClass } from "@/lib/styles";

const copy = adminPortal.users.details;

/** Yesterday's date (YYYY-MM-DD) in the school's time zone: the latest valid date of birth. */
export function schoolYesterday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone }).format(new Date(now.getTime() - 86_400_000));
}

/** Reads the role's profile-detail inputs from a submitted form (blank clears a value). */
export function detailsFromForm(fd: FormData, role: Role): Partial<AdminUserInput> {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  if (role === "student") {
    return { date_of_birth: get("date_of_birth") || null, guardian_name: get("guardian_name"), guardian_phone: get("guardian_phone") };
  }
  if (role === "staff") return { staff_number: get("staff_number"), phone: get("phone") };
  return {};
}

/** Office-only profile details for a student (DOB, guardian) or staff member (staff no., phone). */
export function AdminProfileFields({ idPrefix, role, user }: { idPrefix: string; role: Role; user?: AdminUser }) {
  if (role === "admin") return null;
  const field = (name: string, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={`${idPrefix}-${name}`} className={labelClass}>{label}</label>
      <input id={`${idPrefix}-${name}`} name={name} autoComplete="off" className={fieldClass} {...props} />
    </div>
  );
  // Same rule as the server, so a bad number is caught before submitting.
  const phone = { type: "tel", inputMode: "tel", maxLength: 20, pattern: PHONE_PATTERN, placeholder: copy.phonePlaceholder };
  return role === "student" ? (
    <>
      {field("date_of_birth", copy.dateOfBirth, {
        type: "date",
        max: schoolYesterday(),
        defaultValue: user?.date_of_birth ?? "",
      })}
      {field("guardian_name", copy.guardianName, { maxLength: 120, defaultValue: user?.guardian_name ?? "" })}
      {field("guardian_phone", copy.guardianPhone, { ...phone, defaultValue: user?.guardian_phone ?? "" })}
    </>
  ) : (
    <>
      {field("staff_number", copy.staffNumber, { maxLength: 30, defaultValue: user?.staff_number ?? "" })}
      {field("phone", copy.phone, { ...phone, defaultValue: user?.phone ?? "" })}
    </>
  );
}
