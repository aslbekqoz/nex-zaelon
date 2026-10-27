// Picks the right TMDB image size for each place. Non-TMDB URLs (added by admins) are used as-is.

const TMDB_SIZE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/.+)$/;

export function tmdbSized(url: string, size: string) {
  const m = url.match(TMDB_SIZE);
  return m ? `${m[1]}${size}${m[3]}` : url;
}

type Img = { src: string; srcSet?: string; sizes?: string };

/** Poster for cards (~150–200px wide) or the large detail poster. */
export function posterImage(url: string, variant: "card" | "detail" = "card"): Img {
  if (!TMDB_SIZE.test(url)) return { src: url };
  if (variant === "detail") {
    return { src: tmdbSized(url, "w500"), srcSet: `${tmdbSized(url, "w342")} 342w, ${tmdbSized(url, "w500")} 500w, ${tmdbSized(url, "w780")} 780w`, sizes: "(max-width: 760px) 60vw, 280px" };
  }
  return { src: tmdbSized(url, "w342"), srcSet: `${tmdbSized(url, "w185")} 185w, ${tmdbSized(url, "w342")} 342w`, sizes: "(max-width: 640px) 42vw, 190px" };
}

export function backdropImage(url: string): Img {
  if (!TMDB_SIZE.test(url)) return { src: url };
  return { src: tmdbSized(url, "w1280"), srcSet: `${tmdbSized(url, "w780")} 780w, ${tmdbSized(url, "w1280")} 1280w`, sizes: "100vw" };
}

export function profileImage(url: string): Img {
  if (!TMDB_SIZE.test(url)) return { src: url };
  return { src: tmdbSized(url, "w185"), srcSet: `${tmdbSized(url, "w185")} 185w, ${tmdbSized(url, "h632")} 421w`, sizes: "160px" };
}
