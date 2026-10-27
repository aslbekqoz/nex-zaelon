// Chooses which cast and crew to store and show. Pure, unit tested.

export type RawCast = { id: number; name: string; character?: string | null; order?: number; profile_path?: string | null; known_for_department?: string; popularity?: number };
export type RawCrew = { id: number; name: string; job: string; department?: string; profile_path?: string | null; known_for_department?: string; popularity?: number };

export type CreditPick = {
  tmdbPersonId: number;
  name: string;
  profilePath: string | null;
  knownFor: string | null;
  popularity: number;
  kind: "cast" | "crew";
  role: string;
  department: string | null;
  ord: number;
};

export const MAX_CAST = 15;

// Crew jobs worth showing, in display order
export const KEY_JOBS = ["Director", "Screenplay", "Writer", "Story", "Novel", "Original Music Composer", "Director of Photography", "Editor", "Producer"];
const MAX_PER_JOB: Record<string, number> = { Producer: 3 };

export function pickCredits(credits: { cast?: RawCast[]; crew?: RawCrew[] } | undefined): CreditPick[] {
  const cast = [...(credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, MAX_CAST)
    .map((c, i): CreditPick => ({
      tmdbPersonId: c.id,
      name: c.name,
      profilePath: c.profile_path ?? null,
      knownFor: c.known_for_department ?? null,
      popularity: c.popularity ?? 0,
      kind: "cast",
      role: (c.character ?? "").trim(),
      department: "Acting",
      ord: i,
    }));

  const seen = new Set<string>();
  const perJob = new Map<string, number>();
  const crew = (credits?.crew ?? [])
    .filter((c) => KEY_JOBS.includes(c.job))
    .sort((a, b) => KEY_JOBS.indexOf(a.job) - KEY_JOBS.indexOf(b.job) || (b.popularity ?? 0) - (a.popularity ?? 0))
    .filter((c) => {
      const key = `${c.id}:${c.job}`;
      const n = perJob.get(c.job) ?? 0;
      if (seen.has(key) || n >= (MAX_PER_JOB[c.job] ?? 4)) return false;
      seen.add(key);
      perJob.set(c.job, n + 1);
      return true;
    })
    .map((c, i): CreditPick => ({
      tmdbPersonId: c.id,
      name: c.name,
      profilePath: c.profile_path ?? null,
      knownFor: c.known_for_department ?? null,
      popularity: c.popularity ?? 0,
      kind: "crew",
      role: c.job,
      department: c.department ?? null,
      ord: i,
    }));

  return [...cast, ...crew];
}
