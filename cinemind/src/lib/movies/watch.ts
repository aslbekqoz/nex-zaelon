import "server-only";
import { normalizeRegion, watchOptions, type WatchOptions } from "./providers";
import { tmdbEnabled, tmdbWatchProviders } from "./tmdb";

// Availability changes slowly; one TMDB call per movie every few hours is plenty
const TTL_MS = 6 * 60 * 60 * 1000;
// After a TMDB error, wait a little before asking again instead of retrying on every page view
const ERROR_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 2000;
const cache = new Map<string, { expires: number; value: WatchOptions | null }>();

function remember(key: string, value: WatchOptions | null, ttl: number) {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + ttl, value });
}

export function watchRegion() {
  return normalizeRegion(process.env.TMDB_REGION);
}

/**
 * Where a movie can be streamed, rented or bought in the configured region (TMDB_REGION,
 * default UZ). Null without a TMDB key, for movies not from TMDB, when nothing is listed, or
 * when TMDB fails: the page simply leaves the section out.
 */
export async function getWatchOptions(tmdbId: number | null): Promise<WatchOptions | null> {
  if (!tmdbId || !tmdbEnabled()) return null;
  const region = watchRegion();
  const key = `${tmdbId}:${region}`;
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expires) return hit.value;
  try {
    const value = watchOptions(await tmdbWatchProviders(tmdbId), region);
    remember(key, value, TTL_MS);
    return value;
  } catch (err) {
    console.error("[watch] TMDB watch providers failed:", err);
    remember(key, null, ERROR_TTL_MS);
    return null;
  }
}
