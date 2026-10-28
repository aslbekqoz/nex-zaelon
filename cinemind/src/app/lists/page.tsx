import type { Metadata } from "next";
import { ListCard } from "@/components/ListCard";
import { ListForm } from "@/components/ListForm";
import { requireVerifiedUser } from "@/lib/auth/session";
import { listsOfUser } from "@/lib/lists/repository";
import { getMovie } from "@/lib/movies/repository";

export const metadata: Metadata = { title: "My lists" };

type Props = { searchParams: Promise<{ movie?: string }> };

export default async function ListsPage({ searchParams }: Props) {
  const user = await requireVerifiedUser("/lists");
  const movieParam = Number((await searchParams).movie);
  // Arriving from a movie page's "New list": the new list starts with that movie
  const movie = Number.isSafeInteger(movieParam) && movieParam > 0 ? await getMovie(movieParam) : null;
  const lists = await listsOfUser(user.id);

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <div className="page-head">
        <h1>My lists</h1>
        <p className="muted">Collections of movies you put together — keep them private or share them.</p>
      </div>
      <section className="card-panel" id="new-list">
        <h2>{movie ? `New list with “${movie.title}”` : "New list"}</h2>
        <ListForm movieId={movie?.id} />
      </section>
      {lists.length ? (
        <div className="list-grid">
          {lists.map((l) => (
            <ListCard key={l.id} list={l} showVisibility />
          ))}
        </div>
      ) : (
        <p className="faint">You haven&apos;t made a list yet.</p>
      )}
    </div>
  );
}
