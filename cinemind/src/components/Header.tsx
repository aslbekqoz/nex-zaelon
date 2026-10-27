import Link from "next/link";
import { canUseAdmin, canUseStudio } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";
import { HeaderSearch } from "./HeaderSearch";
import { UserAvatar } from "./UserAvatar";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
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
          {user && canUseStudio(user.role) ? <Link href="/studio">Studio</Link> : null}
          {user && canUseAdmin(user.role) ? <Link href="/admin">Admin</Link> : null}
        </nav>
        <HeaderSearch />
        <div className="header-actions">
          {user ? (
            <>
              <Link href="/account" className="user-chip" title="Account">
                <UserAvatar name={user.name} avatarKey={user.avatarKey} size={28} />
                <span className="user-chip-name">{user.name}</span>
              </Link>
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
