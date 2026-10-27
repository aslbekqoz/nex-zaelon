import { rateMovie } from "@/lib/ratings/actions";

export function RatingWidget({ movieId, rating }: { movieId: number; rating: number | null }) {
  return (
    <form action={rateMovie} className="rating-widget">
      <input type="hidden" name="movieId" value={movieId} />
      <div className="label">{rating ? `Your rating: ${rating}/10` : "Rate this movie to improve your recommendations"}</div>
      <div className="rating-buttons" role="group" aria-label="Your rating">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="submit"
            name="rating"
            value={n}
            className={rating !== null && n <= rating ? "on" : undefined}
            aria-pressed={rating === n}
            aria-label={`${n} out of 10`}
          >
            {n}
          </button>
        ))}
        {rating ? (
          <button type="submit" name="rating" value={0} className="clear">
            Clear
          </button>
        ) : null}
      </div>
    </form>
  );
}
