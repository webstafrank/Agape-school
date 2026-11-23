/** Home page copy. Edit here, not in components. */

export type SchoolSection = {
  name: string;
  levels: string;
  summary: string;
  href: string;
};

export const homeHero = {
  eyebrow: "Welcome to Agape Education Center",
  // The motto itself comes from `site.motto`.
  lead: "A caring, faith-filled community where every child is known, nurtured, and inspired to grow — from their first day of Kindergarten through Junior Secondary.",
  primaryCta: { label: "Apply for admission", href: "/admissions" },
  secondaryCta: { label: "Explore academics", href: "/academics" },
};

export const sectionsIntro = {
  heading: "Three sections, one journey",
  lead: "Each stage builds on the last, so children move forward with confidence.",
  sections: [
    {
      name: "Kindergarten",
      levels: "Pre-Primary 1–2",
      summary: "Play-based learning that builds curiosity, early literacy and numeracy, and social confidence.",
      href: "/academics/kindergarten",
    },
    {
      name: "Primary",
      levels: "Grades 1–6",
      summary: "Strong foundations in reading, mathematics, science, and creative arts, with close teacher attention.",
      href: "/academics/primary",
    },
    {
      name: "Junior Secondary",
      levels: "Grades 7–9",
      summary: "Deeper subject learning, practical skills, and mentorship that prepares learners for senior school.",
      href: "/academics/junior-secondary",
    },
  ] satisfies SchoolSection[],
};

export const admissionsCta = {
  heading: "Admissions are open",
  body: "Visit us, meet our teachers, and see where your child's future begins.",
  cta: { label: "Start your application", href: "/admissions" },
};
