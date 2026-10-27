import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MovieGrid } from "@/components/MovieCard";
import { initials } from "@/components/PersonCard";
import { SmartImage } from "@/components/SmartImage";
import { profileImage } from "@/lib/movies/images";
import { ensurePerson } from "@/lib/movies/sync";
import { getFilmography, getPerson } from "@/lib/people/repository";

type Props = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function formatDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function age(birthday: string, until: string | null) {
  const end = until ? new Date(`${until}T00:00:00Z`) : new Date();
  const b = new Date(`${birthday}T00:00:00Z`);
  let years = end.getUTCFullYear() - b.getUTCFullYear();
  if (end.getUTCMonth() < b.getUTCMonth() || (end.getUTCMonth() === b.getUTCMonth() && end.getUTCDate() < b.getUTCDate())) years--;
  return years;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const person = id ? await getPerson(id) : null;
  return person ? { title: person.name, description: person.biography?.slice(0, 160) } : { title: "Person not found" };
}

export default async function PersonPage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  await ensurePerson(id);
  const [person, films] = await Promise.all([getPerson(id), getFilmography(id)]);
  if (!person) notFound();

  const notes = new Map(films.map((f) => [f.movie.id, [f.roles.slice(0, 2).join(" · ")].filter(Boolean)]));
  const acting = films.filter((f) => f.kinds.includes("cast"));
  const crew = films.filter((f) => f.kinds.includes("crew"));
  const paragraphs = (person.biography ?? "").split(/\n+/).filter(Boolean);

  return (
    <div className="container">
      <div className="person-layout">
        <div className="person-photo person-photo-lg">
          {person.profileUrl ? (
            <SmartImage {...profileImage(person.profileUrl)} alt={person.name} eager fallback={<div className="person-initials">{initials(person.name)}</div>} />
          ) : (
            <div className="person-initials">{initials(person.name)}</div>
          )}
        </div>
        <div>
          <h1 className="person-title">{person.name}</h1>
          <dl className="facts">
            {person.knownFor ? (
              <>
                <dt>Known for</dt>
                <dd>{person.knownFor}</dd>
              </>
            ) : null}
            {person.birthday ? (
              <>
                <dt>Born</dt>
                <dd>
                  {formatDate(person.birthday)}
                  {person.placeOfBirth ? ` · ${person.placeOfBirth}` : ""}
                  {!person.deathday ? ` (age ${age(person.birthday, null)})` : ""}
                </dd>
              </>
            ) : null}
            {person.deathday ? (
              <>
                <dt>Died</dt>
                <dd>
                  {formatDate(person.deathday)}
                  {person.birthday ? ` (aged ${age(person.birthday, person.deathday)})` : ""}
                </dd>
              </>
            ) : null}
            <dt>In the catalogue</dt>
            <dd>
              {films.length} film{films.length === 1 ? "" : "s"}
            </dd>
          </dl>
          {paragraphs.length ? (
            <details className="bio" open={paragraphs.join("").length < 700}>
              <summary>Biography</summary>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </details>
          ) : (
            <p className="muted">No biography yet.</p>
          )}
        </div>
      </div>

      {acting.length ? (
        <section className="section">
          <div className="section-head">
            <h2>Acting</h2>
          </div>
          <MovieGrid movies={acting.map((f) => f.movie)} notes={notes} />
        </section>
      ) : null}
      {crew.length ? (
        <section className="section">
          <div className="section-head">
            <h2>{acting.length ? "Behind the camera" : "Filmography"}</h2>
          </div>
          <MovieGrid movies={crew.map((f) => f.movie)} notes={notes} />
        </section>
      ) : null}
      {!films.length ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <h2>No films in the catalogue yet</h2>
        </div>
      ) : null}
    </div>
  );
}
