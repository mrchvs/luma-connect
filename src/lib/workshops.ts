// Public, lead-gated workshop videos. These are accessible without a platform
// account — visitors enter their name + email to unlock the video.
export interface Workshop {
  slug: string;
  // Headline is split so the middle/last word can render in italic serif.
  titleBefore: string;
  titleEm: string;
  titleAfter: string;
  description: string;
  youtubeId: string;
}

export const WORKSHOPS: Workshop[] = [
  {
    slug: "pricing",
    titleBefore: "Stop",
    titleEm: "leaving",
    titleAfter: "money on the table",
    description:
      "In this workshop, Simone cuts through the noise on one of the most common struggles for early-stage founders — pricing. You'll walk away understanding why undercharging is rarely a strategy problem, how to move from hourly rates to outcome-based offers, and what it actually takes to name your price with confidence.",
    youtubeId: "1Tnw3J-_VGI",
  },
  {
    slug: "sales",
    titleBefore: "From interest to",
    titleEm: "decision",
    titleAfter: "",
    description:
      "Sales doesn't have to feel uncomfortable. In this workshop, Marie shares the four-step framework she's used for over a decade to close deals without convincing or chasing. You'll learn how to lead sales conversations with clarity, ask questions that uncover the real problem, and guide someone to a decision, whether that's yes or no.",
    youtubeId: "YCsiUY1jITs",
  },
  {
    slug: "intention",
    titleBefore: "Start your year with",
    titleEm: "intention",
    titleAfter: "",
    description:
      "In this workshop, you'll move from big-picture vision to concrete action, clarifying what you want to create this year, the intentions behind it, and the one thing to focus on first.",
    youtubeId: "bFd8UT91vIQ",
  },
];

export function getWorkshop(slug: string | undefined): Workshop | undefined {
  return WORKSHOPS.find((w) => w.slug === slug);
}

// Plain-text title (used by the admin leads view and the index page).
export function workshopTitle(w: Workshop): string {
  return [w.titleBefore, w.titleEm, w.titleAfter].filter(Boolean).join(" ");
}
