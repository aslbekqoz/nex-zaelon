import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="CineMind AI bosh sahifa">
          <span className="logo-mark" aria-hidden>
            C
          </span>
          <span>
            CineMind <span className="ai">AI</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Asosiy menyu">
          <Link href="/">Bosh sahifa</Link>
          <Link href="/search">Filmlar</Link>
          <Link href="/watchlist">Ro&apos;yxatim</Link>
        </nav>
        <form action="/search" className="header-search" role="search">
          <label className="sr-only" htmlFor="header-q">
            Film qidirish
          </label>
          <input id="header-q" name="q" className="input" placeholder="Film nomini yozing…" autoComplete="off" />
        </form>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-chip">{user.name}</span>
              <form action={logout}>
                <button type="submit" className="btn btn-sm">
                  Chiqish
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm btn-ghost">
                Kirish
              </Link>
              <Link href="/register" className="btn btn-sm btn-primary hide-sm">
                Ro&apos;yxatdan o&apos;tish
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
