import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false } };

export default function AccountDeletedPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Your account has been deleted</h1>
        <p className="muted">
          Your watchlist, ratings, preferences and profile picture are gone, and you&apos;ve been signed out everywhere. We&apos;ve
          sent a confirmation to your email address.
        </p>
        <div className="tool-row" style={{ marginTop: 24 }}>
          <Link href="/" className="btn btn-primary">
            Back to CineMind
          </Link>
          <Link href="/register" className="btn">
            Sign up again
          </Link>
        </div>
      </div>
    </div>
  );
}
