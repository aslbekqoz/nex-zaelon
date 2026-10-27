import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="CineMind AI home">
          <span className="logo-mark" aria-hidden>
            C
          </span>
          <span>
            CineMind <span className="ai">AI</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Main menu">
          <Link href="/">Home</Link>
          <Link href="/search">Movies</Link>
          <Link href="/recommendations">For you</Link>
          <Link href="/watchlist">My watchlist</Link>
        </nav>
        <form action="/search" className="header-search" role="search">
          <label className="sr-only" htmlFor="header-q">
            Search movies
          </label>
          <input id="header-q" name="q" className="input" placeholder="Search for a movie…" autoComplete="off" />
        </form>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-chip">{user.name}</span>
              <form action={logout}>
                <button type="submit" className="btn btn-sm">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm btn-ghost">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-sm btn-primary hide-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
