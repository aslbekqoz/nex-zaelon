import Link from "next/link";
import { profileImage } from "@/lib/movies/images";
import { SmartImage } from "./SmartImage";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function PersonCard({ id, name, profileUrl, role }: { id: number; name: string; profileUrl: string | null; role?: string }) {
  const fallback = (
    <div className="person-initials" aria-hidden>
      {initials(name)}
    </div>
  );
  return (
    <Link href={`/people/${id}`} className="person-card">
      <div className="person-photo">{profileUrl ? <SmartImage {...profileImage(profileUrl)} alt={name} fallback={fallback} /> : fallback}</div>
      <div className="person-name">{name}</div>
      {role ? <div className="card-sub">{role}</div> : null}
    </Link>
  );
}
