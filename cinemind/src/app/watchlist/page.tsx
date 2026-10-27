import type { Metadata } from "next";
import Link from "next/link";
import { Poster } from "@/components/Poster";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth/session";
import { displayTitle } from "@/lib/movies/types";
import { setWatched, toggleWatchlist } from "@/lib/watchlist/actions";
import { getWatchlist } from "@/lib/watchlist/repository";

export const metadata: Metadata = { title: "Ro'yxatim" };

export default async function WatchlistPage() {
  const user = await requireUser("/watchlist");
  const items = await getWatchlist(user.id);
  const left = items.filter((i) => !i.watched).length;

  return (
    <div className="container">
      <div className="page-head">
        <h1>Mening ro&apos;yxatim</h1>
        <p className="muted">
          {items.length ? `${items.length} ta film · ${left} tasi hali ko'rilmagan` : "Ko'rmoqchi bo'lgan filmlaringizni shu yerda saqlang."}
        </p>
      </div>

      {items.length ? (
        <div className="wl-list" style={{ marginTop: 16 }}>
          {items.map(({ movie, watched }) => (
            <div key={movie.id} className={`wl-item${watched ? " watched" : ""}`}>
              <Link href={`/movies/${movie.id}`}>
                <Poster movie={movie} showRating={false} />
              </Link>
              <div style={{ minWidth: 0 }}>
                <Link href={`/movies/${movie.id}`} className="card-title">
                  {displayTitle(movie)}
                </Link>
                <div className="card-sub">
                  {[movie.year, movie.genres.map((g) => g.nameUz).slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="wl-actions">
                <form action={setWatched}>
                  <input type="hidden" name="movieId" value={movie.id} />
                  <input type="hidden" name="watched" value={watched ? "0" : "1"} />
                  <SubmitButton className="btn btn-sm" pendingText="…">
                    {watched ? "Ko'rilmagan qilish" : "Ko'rdim ✓"}
                  </SubmitButton>
                </form>
                <form action={toggleWatchlist}>
                  <input type="hidden" name="movieId" value={movie.id} />
                  <input type="hidden" name="path" value="/watchlist" />
                  <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                    Olib tashlash
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 16 }}>
          <h2>Ro&apos;yxat bo&apos;sh</h2>
          <p>Film sahifasidagi “Ro&apos;yxatga qo&apos;shish” tugmasini bosing.</p>
          <Link href="/search" className="btn btn-primary" style={{ marginTop: 12 }}>
            Filmlarni ko&apos;rish
          </Link>
        </div>
      )}
    </div>
  );
}
