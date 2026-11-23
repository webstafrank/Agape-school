/**
 * Admissions page copy.
 *
 * DRAFT: placeholder process text — the school must confirm the steps,
 * then set `draft: false`.
 */

export const admissions = {
  draft: true,
  title: "Admissions",
  lead: "We'd love to welcome your family. Send an enquiry and our admissions team will be in touch.",
  steps: {
    heading: "How to join Agape",
    items: [
      { title: "Send an enquiry", text: "Fill in the short form below — it takes about two minutes." },
      { title: "Visit the school", text: "We'll call to arrange a tour and a chat with our teachers." },
      { title: "Assessment & interview", text: "A friendly, age-appropriate assessment helps us place your child well." },
      { title: "Offer & enrolment", text: "Receive your offer, complete the forms, and get ready for the first day." },
    ],
  },
  form: {
    heading: "Admissions enquiry",
    intro: "Fields marked * are required. We only ask for your child's first name.",
    successHeading: "Thank you — we've received your enquiry.",
    successText: "Our admissions team will contact you within two working days.",
    privacy: "We use these details only to respond to your enquiry.",
  },
};

/** Must match backend `Enquiry.Grade` choices (backend/admissions/models.py). */
export const gradeOptions = [
  { value: "pp1", label: "Pre-Primary 1 (Kindergarten)" },
  { value: "pp2", label: "Pre-Primary 2 (Kindergarten)" },
  { value: "grade-1", label: "Grade 1" },
  { value: "grade-2", label: "Grade 2" },
  { value: "grade-3", label: "Grade 3" },
  { value: "grade-4", label: "Grade 4" },
  { value: "grade-5", label: "Grade 5" },
  { value: "grade-6", label: "Grade 6" },
  { value: "grade-7", label: "Grade 7 (Junior Secondary)" },
  { value: "grade-8", label: "Grade 8 (Junior Secondary)" },
  { value: "grade-9", label: "Grade 9 (Junior Secondary)" },
] as const;
