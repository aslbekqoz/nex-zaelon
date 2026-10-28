import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/ConfirmForm";
import { ListForm } from "@/components/ListForm";
import { Poster } from "@/components/Poster";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteListAction, moveInListAction, removeFromListAction } from "@/lib/lists/actions";
import { getListForViewer } from "@/lib/lists/repository";
import { displayTitle } from "@/lib/movies/types";

type Props = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const user = await getCurrentUser();
  const list = id ? await getListForViewer(id, user?.id ?? null) : null;
  // Shared by link; kept out of search engines like member profiles
  return { title: list ? list.title : "List not found", robots: { index: false, follow: true } };
}

export default async function ListPage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const user = await getCurrentUser();
  const list = await getListForViewer(id, user?.id ?? null);
  if (!list) notFound();
  const own = user?.id === list.userId;

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <div className="page-head">
        <p className="faint" style={{ margin: 0 }}>
          {own ? (
            <Link href="/lists" className="link">
              ← My lists
            </Link>
          ) : (
            `A list by ${list.ownerName}`
          )}
          {own ? ` · ${list.isPublic ? "Public: anyone with the link can see it" : "Private: only you can see it"}` : ""}
        </p>
        <h1>{list.title}</h1>
        {list.description ? <p className="muted list-description">{list.description}</p> : null}
        <p className="faint">
          {list.movies.length} {list.movies.length === 1 ? "movie" : "movies"}
        </p>
      </div>

      {list.movies.length ? (
        <ol className="list-items">
          {list.movies.map((m, i) => (
            <li key={m.id} className="list-item">
              <span className="list-rank" aria-hidden="true">
                {i + 1}
              </span>
              <Link href={`/movies/${m.id}`} className="list-item-poster">
                <Poster movie={m} showRating={false} />
              </Link>
              <div className="list-item-body">
                <Link href={`/movies/${m.id}`} className="card-title">
                  {displayTitle(m)}
                </Link>
                <div className="card-sub">{[m.year, m.genres.map((g) => g.name).slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</div>
              </div>
              {own ? (
                <div className="list-item-actions">
                  {(["up", "down"] as const).map((dir) => (
                    <form key={dir} action={moveInListAction}>
                      <input type="hidden" name="listId" value={list.id} />
                      <input type="hidden" name="movieId" value={m.id} />
                      <input type="hidden" name="direction" value={dir} />
                      <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                        <span aria-hidden="true">{dir === "up" ? "↑" : "↓"}</span>
                        <span className="sr-only">
                          Move {displayTitle(m)} {dir}
                        </span>
                      </SubmitButton>
                    </form>
                  ))}
                  <form action={removeFromListAction}>
                    <input type="hidden" name="listId" value={list.id} />
                    <input type="hidden" name="movieId" value={m.id} />
                    <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                      Remove<span className="sr-only"> {displayTitle(m)}</span>
                    </SubmitButton>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty">
          <h2>No movies here yet</h2>
          {own ? <p>Use “Add to list” on any movie page.</p> : null}
        </div>
      )}

      {own ? (
        <section className="card-panel">
          <h2>Edit list</h2>
          <ListForm existing={{ id: list.id, title: list.title, description: list.description, isPublic: list.isPublic }} />
          <ConfirmForm action={deleteListAction} message={`Delete “${list.title}”? This can't be undone.`} style={{ marginTop: 16 }}>
            <input type="hidden" name="listId" value={list.id} />
            <SubmitButton className="btn btn-sm btn-danger" pendingText="Deleting…">
              Delete this list
            </SubmitButton>
          </ConfirmForm>
        </section>
      ) : null}
    </div>
  );
}
