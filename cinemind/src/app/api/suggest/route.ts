import { tmdbSized } from "@/lib/movies/images";
import { suggest, SUGGEST_MAX } from "@/lib/movies/suggest";

// Header search type-ahead: public catalogue data only, so it can be cached briefly
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length > SUGGEST_MAX * 2) return Response.json({ results: [] }, { status: 400 });
  const results = (await suggest(q)).map((s) =>
    s.kind === "movie"
      ? { ...s, posterUrl: s.posterUrl ? tmdbSized(s.posterUrl, "w92") : null }
      : { ...s, profileUrl: s.profileUrl ? tmdbSized(s.profileUrl, "w45") : null },
  );
  return Response.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", "X-Content-Type-Options": "nosniff" } },
  );
}
