// Turns TMDB's watch-provider data (from JustWatch) into what the movie page shows. Pure,
// unit tested.

type RawProvider = { provider_id: number; provider_name: string; logo_path: string | null; display_priority?: number };
type RawRegion = { link?: string; flatrate?: RawProvider[]; free?: RawProvider[]; ads?: RawProvider[]; rent?: RawProvider[]; buy?: RawProvider[] };
export type RawWatchProviders = { results?: Record<string, RawRegion> };

export type Provider = { id: number; name: string; logoUrl: string | null };
export type WatchOptions = { region: string; link: string | null; groups: { label: string; providers: Provider[] }[] };

const GROUPS: [keyof RawRegion, string][] = [
  ["flatrate", "Stream"],
  ["free", "Free"],
  ["ads", "Free with ads"],
  ["rent", "Rent"],
  ["buy", "Buy"],
];

/** Two-letter region code (ISO 3166-1), or the fallback when the setting is missing or malformed. */
export function normalizeRegion(value: string | undefined, fallback = "UZ") {
  const v = value?.trim().toUpperCase();
  return v && /^[A-Z]{2}$/.test(v) ? v : fallback;
}

/** The options for one region, or null when TMDB lists none there. */
export function watchOptions(raw: RawWatchProviders, region: string): WatchOptions | null {
  const r = raw.results?.[region];
  if (!r) return null;
  const groups = GROUPS.flatMap(([key, label]) => {
    const list = r[key];
    if (!Array.isArray(list) || !list.length) return [];
    const seen = new Set<number>();
    const providers = [...list]
      .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
      .filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id))
      .map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
      }));
    return [{ label, providers }];
  });
  if (!groups.length) return null;
  // Only TMDB's own page may be linked (it credits JustWatch and links on to the services)
  const link = r.link && /^https:\/\/www\.themoviedb\.org\//.test(r.link) ? r.link : null;
  return { region, link, groups };
}

/** Region code to an English name, e.g. "UZ" → "Uzbekistan". */
export function regionName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
