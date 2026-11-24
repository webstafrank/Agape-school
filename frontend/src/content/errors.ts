/** Copy for 404/500 pages and portal error messages. Edit freely. */

export const errorPages = {
  notFound: {
    eyebrow: "Error 404",
    title: "We couldn't find that page",
    lead: "The page may have moved, or the link might be mistyped. These might help:",
    links: [
      { label: "Home", href: "/" },
      { label: "Admissions", href: "/admissions" },
      { label: "News & Events", href: "/news" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  serverError: {
    eyebrow: "Something went wrong",
    title: "Sorry — this page didn't load",
    lead: "It's not you, it's us. Please try again in a moment. If it keeps happening, contact the school office.",
    retry: "Try again",
    home: "Go to the home page",
    reference: "Reference code",
  },
};

export const apiErrors = {
  sessionEnded: "Your session has ended.",
  signIn: "Sign in again",
  forbidden: "You don't have access to this.",
  offline: "We couldn't reach the school server. Check your internet connection.",
  server: "Something went wrong on our side.",
  generic: "We couldn't load this right now.",
  retry: "Try again",
};
