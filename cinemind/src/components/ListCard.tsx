import Link from "next/link";
import { posterImage } from "@/lib/movies/images";
import type { ListSummary } from "@/lib/lists/repository";

export function ListCard({ list, showVisibility = false }: { list: ListSummary; showVisibility?: boolean }) {
  return (
    <Link href={`/lists/${list.id}`} className="list-card">
      <span className="list-cover" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (list.posters[i] ? <img key={i} src={posterImage(list.posters[i]).src} alt="" loading="lazy" /> : <span key={i} />))}
      </span>
      <span className="list-card-body">
        <strong>{list.title}</strong>
        <span className="faint">
          {list.items} {list.items === 1 ? "movie" : "movies"}
          {showVisibility ? ` · ${list.isPublic ? "Public" : "Private"}` : ""}
        </span>
      </span>
    </Link>
  );
}
