import Link from "next/link";
import { AuditTable } from "@/components/admin/AuditTable";
import { dashboardStats } from "@/lib/admin/repository";
import { listAudit } from "@/lib/audit";
import { tmdbEnabled } from "@/lib/movies/tmdb";
import { aiEnabled } from "@/lib/studio/ai";

export default async function AdminHome() {
  const [s, recent] = await Promise.all([dashboardStats(), listAudit({ limit: 12 })]);
  const cards: { label: string; value: number; sub?: string; href?: string }[] = [
    { label: "Users", value: s.users, sub: `${s.users_7d} new this week · ${s.admins} admin${s.admins === 1 ? "" : "s"}`, href: "/admin/users" },
    { label: "Movies", value: s.movies, sub: `${s.movies_tmdb} from TMDB · ${s.movies_manual} added by hand`, href: "/admin/movies" },
    { label: "Ratings", value: s.ratings, sub: `${s.watchlist} watchlist saves` },
    { label: "Studio drafts", value: s.drafts, sub: `${s.drafts_ready} ready to use`, href: "/studio" },
  ];
  const attention: { text: string; href: string }[] = [];
  if (s.facts_pending) attention.push({ text: `${s.facts_pending} fact${s.facts_pending === 1 ? "" : "s"} waiting for review`, href: "/studio/facts?status=unverified" });
  if (s.failed_logins_24h >= 10) attention.push({ text: `${s.failed_logins_24h} failed sign-ins in the last 24 hours`, href: "/admin/audit" });
  if (s.disabled) attention.push({ text: `${s.disabled} disabled account${s.disabled === 1 ? "" : "s"}`, href: "/admin/users?status=disabled" });

  return (
    <>
      <div className="stat-grid">
        {cards.map((c) => {
          const inner = (
            <>
              <span className="stat-label">{c.label}</span>
              <span className="stat-value">{c.value.toLocaleString("en-US")}</span>
              {c.sub ? <span className="faint stat-sub">{c.sub}</span> : null}
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="stat-card">
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="stat-card">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="admin-columns">
        <section className="card-panel">
          <h2>Needs attention</h2>
          {attention.length ? (
            <ul className="plain-list">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link href={a.href}>⚠️ {a.text} →</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">All clear.</p>
          )}
          <h2 style={{ marginTop: 20 }}>Integrations</h2>
          <ul className="plain-list">
            <li>{tmdbEnabled() ? "✅" : "⚪"} TMDB movie data {tmdbEnabled() ? "connected" : "not configured (TMDB_API_KEY)"}</li>
            <li>{aiEnabled() ? "✅" : "⚪"} AI writing {aiEnabled() ? "enabled" : "not configured (ANTHROPIC_API_KEY)"}</li>
            <li>
              {process.env.TRUST_PROXY_HEADERS === "1" ? "✅" : "⚪"} Per-IP rate limits{" "}
              {process.env.TRUST_PROXY_HEADERS === "1" ? "on" : "off — only per-email limits (set TRUST_PROXY_HEADERS=1 behind a proxy)"}
            </li>
          </ul>
        </section>
        <section className="card-panel">
          <div className="section-head">
            <h2>Recent activity</h2>
            <Link href="/admin/audit">Full log →</Link>
          </div>
          <AuditTable entries={recent} />
        </section>
      </div>
    </>
  );
}
