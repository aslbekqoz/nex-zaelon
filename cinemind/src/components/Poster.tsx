import type { Movie } from "@/lib/movies/types";
import { displayTitle } from "@/lib/movies/types";

// Without a poster, derive a stable colour gradient from the title
function hueFrom(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function Poster({ movie, showRating = true, eager = false }: { movie: Movie; showRating?: boolean; eager?: boolean }) {
  const title = displayTitle(movie);
  const hue = hueFrom(movie.title);
  return (
    <div className="poster">
      {movie.posterUrl ? (
        <img src={movie.posterUrl} alt={title} loading={eager ? "eager" : "lazy"} />
      ) : (
        <div
          className="poster-fallback"
          style={{
            background: `linear-gradient(160deg, hsl(${hue} 55% 34%), hsl(${(hue + 40) % 360} 60% 12%))`,
          }}
          aria-label={title}
        >
          {title}
          {movie.year ? <small>{movie.year}</small> : null}
        </div>
      )}
      {showRating && movie.rating ? <span className="poster-badge">★ {movie.rating.toFixed(1)}</span> : null}
    </div>
  );
}
