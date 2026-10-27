import { posterImage } from "@/lib/movies/images";
import type { Movie } from "@/lib/movies/types";
import { displayTitle } from "@/lib/movies/types";
import { SmartImage } from "./SmartImage";

// Without a poster, derive a stable colour gradient from the title
function hueFrom(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

type Props = { movie: Movie; showRating?: boolean; eager?: boolean; variant?: "card" | "detail" };

export function Poster({ movie, showRating = true, eager = false, variant = "card" }: Props) {
  const title = displayTitle(movie);
  const hue = hueFrom(movie.title);
  const fallback = (
    <div
      className="poster-fallback"
      style={{ background: `linear-gradient(160deg, hsl(${hue} 55% 34%), hsl(${(hue + 40) % 360} 60% 12%))` }}
      aria-label={title}
    >
      {title}
      {movie.year ? <small>{movie.year}</small> : null}
    </div>
  );
  return (
    <div className="poster">
      {movie.posterUrl ? <SmartImage {...posterImage(movie.posterUrl, variant)} alt={title} eager={eager} fallback={fallback} /> : fallback}
      {showRating && movie.rating ? <span className="poster-badge">★ {movie.rating.toFixed(1)}</span> : null}
    </div>
  );
}
