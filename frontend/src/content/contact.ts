/**
 * Contact page copy. Phone, email, and address live in `site.contact`
 * (shared with the footer) — edit them there.
 *
 * DRAFT: hours and map location are placeholders. Replace them with the
 * school's real details and set `draft: false`.
 */

export const contact = {
  draft: true,
  title: "Contact us",
  lead: "We'd love to hear from you. Call, email, or visit — our office team will be happy to help.",
  hours: {
    heading: "Office hours",
    items: [
      { days: "Monday – Friday", time: "7:30 am – 5:00 pm" },
      { days: "Saturday", time: "8:00 am – 12:00 pm" },
      { days: "Sundays & public holidays", time: "Closed" },
    ],
  },
  map: {
    heading: "Find us",
    /**
     * What Google Maps searches for. Use the school's name as listed on
     * Google Maps, a full address, or "latitude,longitude" (e.g. "-1.2921,36.8219").
     */
    query: "Nairobi, Kenya",
    directionsLabel: "Get directions",
  },
  admissionsPrompt: {
    text: "Thinking about joining Agape?",
    linkLabel: "Send an admissions enquiry",
  },
};
