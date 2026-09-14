import productionDelivery from "./sanctum-film-production.json";

type FilmDelivery = {
  desktop: string;
  mobile: string;
  poster: string;
  mobilePoster: string;
  hasAudio: boolean;
  chapters: { at: number; word: string }[];
};
const production = productionDelivery as { film: FilmDelivery | null };

/** Use the delivered photographic film; retain the original as a development fallback. */
export const sanctumFilm = {
  desktop: "/sanctum/concept-desktop-v1.mp4",
  mobile: "/sanctum/concept-mobile-v1.mp4",
  poster: "/sanctum/arrival.webp",
  mobilePoster: "/sanctum/poster-mobile.webp",
  hasAudio: false,
  chapters: [
    { at: 0, word: "ARRIVE" },
    { at: 5, word: "CONFIDENCE" },
    { at: 15, word: "RESTORE" },
    { at: 25, word: "BUILD" },
    { at: 35, word: "BELONG" },
    { at: 45, word: "BECOME" },
  ],
  ...production.film,
} as const;
