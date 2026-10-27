"use client";

import { useActionState } from "react";
import type { Genre, Movie } from "@/lib/movies/types";
import { saveOnboarding } from "@/lib/preferences/actions";
import { Poster } from "./Poster";
import { SubmitButton } from "./SubmitButton";

type Props = {
  genres: Genre[];
  movies: Movie[];
  selectedGenreIds: number[];
  ratedMovieIds: number[];
};

export function OnboardingForm({ genres, movies, selectedGenreIds, ratedMovieIds }: Props) {
  const [state, action] = useActionState(saveOnboarding, {});
  const selected = new Set(selectedGenreIds);
  const rated = new Set(ratedMovieIds);
  return (
    <form action={action}>
      <section className="onboard-section">
        <h2>1. Genres you enjoy</h2>
        <p className="muted">Pick as many as you like.</p>
        <div className="chips">
          {genres.map((g) => (
            <label key={g.id} className="chip pick">
              <input type="checkbox" name="genre" value={g.id} defaultChecked={selected.has(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
      </section>

      <section className="onboard-section">
        <h2>2. Movies you liked</h2>
        <p className="muted">Optional. Each pick is saved as an 8/10 rating, which you can change on the movie page.</p>
        <div className="grid">
          {movies.map((m) => (
            <label key={m.id} className="pick pick-card">
              <input type="checkbox" name="movie" value={m.id} defaultChecked={rated.has(m.id)} disabled={rated.has(m.id)} />
              <span className="check" aria-hidden>
                ✓
              </span>
              <Poster movie={m} showRating={false} />
              <span className="card-title">{m.title}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="sticky-submit">
        <SubmitButton className="btn btn-primary btn-lg" pendingText="Saving…">
          Show my recommendations
        </SubmitButton>
        {state.error ? (
          <span className="form-error" role="alert">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
