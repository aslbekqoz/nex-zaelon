// Moods map to genre weights (TMDB genre ids) in [-1, 1] plus optional constraints.
// Negative weights push genres away, e.g. no horror when you want something cosy.

export type Mood = {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  genres: Record<number, number>;
  maxRuntime?: number;
};

const G = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80, documentary: 99, drama: 18,
  family: 10751, fantasy: 14, history: 36, horror: 27, music: 10402, mystery: 9648, romance: 10749,
  scifi: 878, thriller: 53, war: 10752, western: 37,
} as const;

export const MOODS: Mood[] = [
  {
    slug: "laugh", label: "Make me laugh", emoji: "😂", description: "Light, funny, easy to watch",
    genres: { [G.comedy]: 1, [G.animation]: 0.5, [G.family]: 0.4, [G.romance]: 0.3, [G.horror]: -1, [G.war]: -0.7, [G.thriller]: -0.4 },
  },
  {
    slug: "thrill", label: "On the edge", emoji: "😰", description: "Tense thrillers and crime",
    genres: { [G.thriller]: 1, [G.crime]: 0.7, [G.mystery]: 0.7, [G.action]: 0.4, [G.horror]: 0.3, [G.family]: -0.8, [G.animation]: -0.6 },
  },
  {
    slug: "mind-bending", label: "Mind-bending", emoji: "🧠", description: "Big ideas and twists",
    genres: { [G.scifi]: 1, [G.mystery]: 0.7, [G.thriller]: 0.4, [G.drama]: 0.3, [G.family]: -0.5 },
  },
  {
    slug: "emotional", label: "A good cry", emoji: "😢", description: "Moving, character-driven stories",
    genres: { [G.drama]: 1, [G.romance]: 0.6, [G.history]: 0.4, [G.war]: 0.3, [G.music]: 0.3, [G.horror]: -0.8, [G.action]: -0.3 },
  },
  {
    slug: "adventure", label: "Epic adventure", emoji: "🗺️", description: "Big worlds and big journeys",
    genres: { [G.adventure]: 1, [G.action]: 0.7, [G.fantasy]: 0.7, [G.scifi]: 0.5, [G.western]: 0.3 },
  },
  {
    slug: "feel-good", label: "Feel-good", emoji: "☀️", description: "Warm, cosy, uplifting",
    genres: { [G.family]: 1, [G.animation]: 0.8, [G.comedy]: 0.7, [G.music]: 0.5, [G.romance]: 0.4, [G.horror]: -1, [G.crime]: -0.6, [G.thriller]: -0.6, [G.war]: -0.6 },
  },
  {
    slug: "scary", label: "Scare me", emoji: "👻", description: "Horror and dread",
    genres: { [G.horror]: 1, [G.thriller]: 0.6, [G.mystery]: 0.5, [G.family]: -1, [G.animation]: -0.8, [G.comedy]: -0.4 },
  },
  {
    slug: "date-night", label: "Date night", emoji: "💞", description: "Romance with a spark",
    genres: { [G.romance]: 1, [G.comedy]: 0.6, [G.music]: 0.5, [G.drama]: 0.3, [G.horror]: -0.7, [G.war]: -0.6 },
  },
  {
    slug: "short", label: "Short on time", emoji: "⏱️", description: "Great picks under 1h 50m",
    genres: {}, maxRuntime: 110,
  },
];

export function findMood(slug: string | undefined | null) {
  return MOODS.find((m) => m.slug === slug);
}
