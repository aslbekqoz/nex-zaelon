import type { Metadata } from "next";
import Link from "next/link";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { confirmEmail } from "@/lib/auth/verify";

// The token is in the URL: keep it out of Referer headers and search engines
export const metadata: Metadata = { title: "Confirm email", referrer: "no-referrer", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const result = await confirmEmail((await searchParams).token);
  if (result.ok && !result.already) await audit(result.userId, "auth.email_verified", { type: "user", id: result.userId });
  const user = await getCurrentUser();

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {result.ok ? (
          <>
            <h1>Email confirmed ✓</h1>
            <p className="muted">
              {result.already ? (
                <>
                  <strong>{result.email}</strong> was already confirmed.
                </>
              ) : (
                <>
                  Thanks! <strong>{result.email}</strong> is now confirmed.
                </>
              )}
            </p>
            <Link href={user ? "/" : "/login"} className="btn btn-primary" style={{ marginTop: 16 }}>
              {user ? "Continue to CineMind" : "Sign in"}
            </Link>
          </>
        ) : (
          <>
            <h1>Can&apos;t confirm this link</h1>
            <div className="form-error" role="alert" style={{ margin: "16px 0" }}>
              {result.error}
            </div>
            <p className="muted">
              {user
                ? "Use “Resend email” in the banner at the top of the page to get a new link."
                : "Sign in and use “Resend email” in the banner at the top of the page to get a new link."}
            </p>
            {!user ? (
              <Link href="/login" className="btn btn-primary" style={{ marginTop: 12 }}>
                Sign in
              </Link>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
