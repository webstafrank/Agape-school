/**
 * Academics copy: overview + one entry per school section.
 *
 * DRAFT: placeholder text based on Kenya's Competency-Based Curriculum
 * (CBC). The school must confirm learning areas, hours, and activities,
 * then set `draft: false`.
 */

export type AcademicSection = {
  slug: "kindergarten" | "primary" | "junior-secondary";
  name: string;
  levels: string;
  ages: string;
  summary: string;
  intro: string;
  highlights: { title: string; text: string }[];
  learningAreas: string[];
  dayAtSchool: string;
  activities: string[];
};

export const academicsOverview = {
  draft: true,
  title: "Academics",
  lead: "From first steps in Kindergarten to Junior Secondary, learning at Agape builds step by step — with caring teachers at every stage.",
  curriculum: {
    heading: "Our curriculum",
    text: "We follow Kenya's Competency-Based Curriculum (CBC), which develops knowledge, practical skills, and values together. Learners are assessed continuously, so teachers and parents can see progress throughout the year — not only at exam time.",
  },
  approach: {
    heading: "How we teach",
    items: [
      { title: "Small classes", text: "Teachers know every learner and can give individual attention." },
      { title: "Learning by doing", text: "Projects, experiments, and hands-on activities make lessons stick." },
      { title: "Partnership with parents", text: "Regular updates and meetings keep families involved." },
    ],
  },
};

export const academicSections: AcademicSection[] = [
  {
    slug: "kindergarten",
    name: "Kindergarten",
    levels: "Pre-Primary 1–2",
    ages: "Ages 4–5",
    summary: "Play-based learning that builds curiosity, early literacy and numeracy, and social confidence.",
    intro: "Our Kindergarten is a gentle, joyful first step into school. Through play, songs, stories, and hands-on activities, children build early literacy and numeracy, learn to share and work together, and grow in confidence.",
    highlights: [
      { title: "Learning through play", text: "Structured play builds language, thinking, and motor skills." },
      { title: "Safe and caring", text: "A warm environment with close supervision and routine." },
      { title: "Ready for Grade 1", text: "Children leave confident in early reading, writing, and counting." },
    ],
    learningAreas: [
      "Language Activities",
      "Mathematical Activities",
      "Environmental Activities",
      "Creative Activities",
      "Religious Education Activities",
    ],
    dayAtSchool: "A typical day mixes circle time, short focused lessons, outdoor play, creative activities, story time, and rest.",
    activities: ["Music and movement", "Art and craft", "Outdoor play", "Story time"],
  },
  {
    slug: "primary",
    name: "Primary",
    levels: "Grades 1–6",
    ages: "Ages 6–11",
    summary: "Strong foundations in reading, mathematics, science, and creative arts, with close teacher attention.",
    intro: "In Primary, learners build strong foundations in reading, writing, mathematics, and science, while discovering their talents in creative arts and sports. Teachers track each child's progress closely and keep parents informed.",
    highlights: [
      { title: "Strong foundations", text: "Daily focus on literacy and numeracy in Lower Primary." },
      { title: "Curious minds", text: "Science, projects, and practical work in Upper Primary." },
      { title: "Growing character", text: "Values, responsibility, and teamwork built into school life." },
    ],
    learningAreas: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Science and Technology",
      "Agriculture and Nutrition",
      "Social Studies",
      "Creative Arts",
      "Religious Education",
    ],
    dayAtSchool: "Mornings focus on core subjects; afternoons include practical learning, creative arts, physical education, and clubs.",
    activities: ["Sports and athletics", "Music and drama", "Reading club", "Environmental club"],
  },
  {
    slug: "junior-secondary",
    name: "Junior Secondary",
    levels: "Grades 7–9",
    ages: "Ages 12–14",
    summary: "Deeper subject learning, practical skills, and mentorship that prepares learners for senior school.",
    intro: "Junior Secondary deepens subject knowledge and introduces pre-technical and practical skills. With mentorship and career guidance, learners grow in independence and prepare for the senior school pathway that suits them.",
    highlights: [
      { title: "Deeper learning", text: "Subject-specialist teaching across sciences, languages, and humanities." },
      { title: "Practical skills", text: "Pre-technical studies, agriculture, and project work." },
      { title: "Mentorship", text: "Guidance to help learners choose their senior school pathway." },
    ],
    learningAreas: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Integrated Science",
      "Social Studies",
      "Pre-Technical Studies",
      "Agriculture and Nutrition",
      "Creative Arts and Sports",
      "Religious Education",
    ],
    dayAtSchool: "A structured timetable of specialist lessons, practical sessions, supervised study, and co-curricular activities.",
    activities: ["Science and technology club", "Debate and public speaking", "Sports teams", "Mentorship sessions"],
  },
];

export function getAcademicSection(slug: string): AcademicSection | undefined {
  return academicSections.find((s) => s.slug === slug);
}
