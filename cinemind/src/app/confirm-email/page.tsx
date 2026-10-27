import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResendVerification } from "@/components/ResendVerification";
import { logout } from "@/lib/auth/actions";
import { needsEmailConfirmation, requireUser, safeNextPath } from "@/lib/auth/session";
import { emailConfigured } from "@/lib/email/send";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function ConfirmEmailPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);
  const user = await requireUser(`/confirm-email?next=${encodeURIComponent(next)}`);
  // Already confirmed (or confirmation is optional): carry on to where they were going
  if (!needsEmailConfirmation(user)) redirect(next);
  const canSend = emailConfigured() || process.env.NODE_ENV !== "production";

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Check your inbox 📧</h1>
        <p className="muted">
          To use your watchlist, ratings and recommendations, confirm your email address. We sent a link to{" "}
          <strong style={{ color: "var(--text)", overflowWrap: "anywhere" }}>{user.email}</strong>.
        </p>
        {canSend ? (
          <>
            <p className="faint" style={{ fontSize: 14 }}>
              Open the link on any device; then come back and reload this page. The link expires in 48 hours — check your spam folder too.
            </p>
            <div style={{ marginTop: 16 }}>
              <ResendVerification />
            </div>
          </>
        ) : (
          <div className="notice" style={{ marginTop: 16 }}>
            Email isn&apos;t set up on this site yet, so we can&apos;t send the link. Please ask the site administrator to confirm your account.
          </div>
        )}
        <p className="auth-alt" style={{ marginTop: 24 }}>
          Wrong address? Sign out and create the account again with the right one.
        </p>
        <form action={logout} style={{ textAlign: "center" }}>
          <button type="submit" className="btn btn-sm btn-ghost">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
