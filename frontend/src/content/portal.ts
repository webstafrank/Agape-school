/**
 * Portal copy: sign-in page and dashboard placeholders.
 * Edit freely — no code changes needed.
 */
import type { Role } from "@/lib/api";

export const login = {
  title: "Portal sign in",
  lead: "Students, staff, and administrators sign in here.",
  usernameLabel: "Admission no. / Staff ID",
  usernameHint: "Students: your admission number. Staff: your staff ID.",
  passwordLabel: "Password",
  submit: "Sign in",
  submitting: "Signing in…",
  forgot:
    "Forgot your password? Please contact the school office and we'll reset it for you.",
  errors: {
    invalid: "That admission no. / staff ID and password don't match. Please try again.",
    throttled: "Too many sign-in attempts. Please wait a minute and try again.",
    network: "We couldn't reach the school server. Check your connection and try again.",
    unknown: "Something went wrong signing you in. Please try again.",
  },
  expired: "Your session has ended. Please sign in again.",
};

export type PortalTile = { title: string; text: string };

export const portals: Record<Role, { title: string; lead: string; tiles: PortalTile[] }> = {
  student: {
    title: "Student portal",
    lead: "Your results, timetable, and school news in one place.",
    tiles: [],
  },
  staff: {
    title: "Staff portal",
    lead: "Your classes, results entry, and class announcements.",
    tiles: [
      { title: "My classes", text: "The classes and subjects assigned to you." },
      { title: "Enter results", text: "Record and update marks for your classes." },
      { title: "Class announcements", text: "Post updates to the classes you teach." },
    ],
  },
  admin: {
    title: "Admin portal",
    lead: "Manage users, classes, terms, site content, and approvals.",
    tiles: [
      { title: "Users", text: "Add and manage students, staff, and administrators." },
      { title: "Classes & terms", text: "Set up classes, subjects, and the school calendar." },
      { title: "Gallery approvals", text: "Review photos and videos before they go public." },
      { title: "Admissions enquiries", text: "Follow up on enquiries from families." },
    ],
  },
};

export const portalShell = {
  checking: "Checking your sign-in…",
  signedInAs: "Signed in as",
  logout: "Log out",
  comingSoon: "Coming soon",
  unavailable: "We couldn't reach the school server. Please check your connection and try again.",
  retry: "Try again",
  adminTools: "Until these tools are ready, use the Django admin:",
  adminToolsLink: "Open Django admin",
};

/** Student portal pages. */
export const studentPortal = {
  nav: [
    { href: "/portal/student", label: "Overview" },
    { href: "/portal/student/results", label: "Results" },
    { href: "/portal/student/timetable", label: "Timetable" },
    { href: "/portal/student/announcements", label: "Announcements" },
    { href: "/portal/student/fees", label: "Fees" },
  ],
  noClass: "You haven't been placed in a class yet. Please ask the school office.",
  loading: "Loading…",
  error: "We couldn't load this right now.",
  retry: "Try again",
  results: {
    title: "My results",
    lead: "Your scores and performance levels for each term.",
    cardTitle: "Latest results",
    termLabel: "Term",
    average: "Average score",
    subject: "Subject",
    score: "Score",
    level: "Level",
    comment: "Teacher's comment",
    empty: "No results have been released yet. They appear here once the school publishes them.",
    viewAll: "All results",
  },
  timetable: {
    title: "Timetable",
    lead: "Your weekly lessons.",
    cardTitle: "Today's lessons",
    today: "Today",
    weekend: "No lessons today — enjoy your weekend!",
    noLessonsToday: "No lessons scheduled today.",
    empty: "Your timetable hasn't been added yet.",
    viewAll: "Full week",
  },
  announcements: {
    title: "Announcements",
    lead: "News from your teachers and the school.",
    cardTitle: "Latest announcements",
    wholeSchool: "Whole school",
    empty: "No announcements yet.",
    viewAll: "All announcements",
  },
  fees: {
    title: "Fees",
    lead: "What has been paid and what is due, by term.",
    cardTitle: "Fee balance",
    due: "Amount due",
    paid: "Paid",
    balance: "Balance",
    fullyPaid: "Fully paid — thank you!",
    empty: "No fee records yet.",
    viewAll: "Fee details",
    note: "Questions about fees? Please contact the school office.",
  },
};
