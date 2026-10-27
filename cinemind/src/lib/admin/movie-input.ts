// Validation and normalisation of the admin movie form. Pure, unit tested.

export type MovieInput = {
  title: string;
  titleUz: string | null;
  originalTitle: string | null;
  overview: string | null;
  overviewUz: string | null;
  director: string | null;
  releaseDate: string | null;
  runtime: number | null;
  originalLanguage: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerKey: string | null;
  genreIds: number[];
  syncLocked: boolean;
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a bare YouTube id or any common YouTube URL; returns the 11-character id. */
export function parseYoutubeKey(input: string): string | null | undefined {
  const v = input.trim();
  if (!v) return null;
  if (YT_ID.test(v)) return v;
  try {
    const u = new URL(v);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && YT_ID.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

function text(fields: Record<string, string>, key: string, max: number) {
  const v = (fields[key] ?? "").replace(/\r\n/g, "\n").trim();
  if (v.length > max) throw new Error(`${key} is too long (${max} characters max).`);
  return v || null;
}

function url(fields: Record<string, string>, key: string, label: string) {
  const v = text(fields, key, 1000);
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString();
  } catch {
    throw new Error(`${label} must be an http(s) link.`);
  }
}

export function parseMovieInput(
  fields: Record<string, string>,
  genreValues: string[],
): { ok: true; value: MovieInput } | { ok: false; error: string } {
  try {
    const title = text(fields, "title", 300);
    if (!title) return { ok: false, error: "Title is required." };

    let releaseDate: string | null = null;
    const rd = (fields.releaseDate ?? "").trim();
    if (rd) {
      if (/^\d{4}$/.test(rd)) releaseDate = `${rd}-01-01`;
      else if (/^\d{4}-\d{2}-\d{2}$/.test(rd) && !Number.isNaN(Date.parse(rd))) releaseDate = rd;
      else return { ok: false, error: "Release date must be YYYY or YYYY-MM-DD." };
      const year = Number(releaseDate.slice(0, 4));
      if (year < 1874 || year > new Date().getFullYear() + 10) return { ok: false, error: "Release year looks wrong." };
    }

    let runtime: number | null = null;
    const rt = (fields.runtime ?? "").trim();
    if (rt) {
      runtime = Number(rt);
      if (!Number.isInteger(runtime) || runtime < 1 || runtime > 1000) return { ok: false, error: "Runtime must be minutes between 1 and 1000." };
    }

    const lang = text(fields, "originalLanguage", 10)?.toLowerCase() ?? null;
    if (lang && !/^[a-z]{2,3}$/.test(lang)) return { ok: false, error: "Original language must be a 2–3 letter code (e.g. en, uz)." };

    const trailerKey = parseYoutubeKey(fields.trailer ?? "");
    if (trailerKey === undefined) return { ok: false, error: "Trailer must be a YouTube link or video id." };

    const genreIds = [...new Set(genreValues.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))];

    return {
      ok: true,
      value: {
        title,
        titleUz: text(fields, "titleUz", 300),
        originalTitle: text(fields, "originalTitle", 300),
        overview: text(fields, "overview", 5000),
        overviewUz: text(fields, "overviewUz", 5000),
        director: text(fields, "director", 300),
        releaseDate,
        runtime,
        originalLanguage: lang,
        posterUrl: url(fields, "posterUrl", "Poster"),
        backdropUrl: url(fields, "backdropUrl", "Backdrop"),
        trailerKey,
        genreIds,
        syncLocked: fields.syncLocked === "on",
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
