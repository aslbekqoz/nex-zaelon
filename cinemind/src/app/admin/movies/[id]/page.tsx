import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MovieForm } from "@/components/admin/MovieForm";
import { deleteMovie } from "@/lib/admin/actions";
import { allGenres, getMovieForEdit } from "@/lib/admin/repository";

export const metadata: Metadata = { title: "Edit movie" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function EditMoviePage({ params, searchParams }: Props) {
  const id = Number((await params).id);
  const m = Number.isSafeInteger(id) && id > 0 ? await getMovieForEdit(id) : null;
  if (!m) notFound();
  const created = (await searchParams).created === "1";

  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>{m.title}</h2>
        <div className="chips">
          <Link href={`/movies/${m.id}`} className="btn btn-sm">
            View on site
          </Link>
          <form action={deleteMovie}>
            <input type="hidden" name="id" value={m.id} />
            <button className="btn btn-sm btn-ghost danger">Delete movie</button>
          </form>
        </div>
      </div>
      {created ? <div className="form-ok">Movie added.</div> : null}
      {m.sync_locked ? <p className="faint">🔒 TMDB refresh is currently off for this movie.</p> : null}
      <p className="muted">
        Source: {m.source === "tmdb" ? "TMDB" : m.source === "seed" ? "starter catalogue" : "added by hand"}. Deleting a movie also removes
        its ratings, watchlist entries and facts.
      </p>
      <MovieForm
        genres={await allGenres()}
        movie={{
          id: m.id,
          tmdbId: m.tmdb_id,
          title: m.title,
          titleUz: m.title_uz,
          originalTitle: m.original_title,
          overview: m.overview,
          overviewUz: m.overview_uz,
          director: m.director,
          releaseDate: m.release_date,
          runtime: m.runtime,
          originalLanguage: m.original_language,
          posterUrl: m.poster_url,
          backdropUrl: m.backdrop_url,
          trailerKey: m.trailer_youtube_key,
          genreIds: m.genre_ids,
          // Saving a hand edit locks the movie against TMDB refreshes unless the admin unticks it
          syncLocked: true,
        }}
      />
    </>
  );
}
