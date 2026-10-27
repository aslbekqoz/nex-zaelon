import { getCurrentUser, needsEmailConfirmation } from "@/lib/auth/session";
import { appUrl } from "@/lib/site";
import { getWatchlist } from "@/lib/watchlist/repository";
import { applyWatchlistView, watchlistCsv } from "@/lib/watchlist/view";

// Downloads the watchlist as CSV. Read-only, so a GET is fine: another site can trigger the
// download but can't read the response.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/login?next=/watchlist", req.url), 303);
  if (needsEmailConfirmation(user)) return Response.redirect(new URL("/confirm-email?next=/watchlist", req.url), 303);
  const items = applyWatchlistView(await getWatchlist(user.id), { filter: "all", sort: "added" });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(watchlistCsv(items, appUrl()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cinemind-watchlist-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
