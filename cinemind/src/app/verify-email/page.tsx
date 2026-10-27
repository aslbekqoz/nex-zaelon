import type { Metadata } from "next";
import Link from "next/link";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { getPreferences } from "@/lib/preferences/repository";
import { confirmEmail } from "@/lib/auth/verify";

// The token is in the URL: keep it out of Referer headers and search engines
export const metadata: Metadata = { title: "Confirm email", referrer: "no-referrer", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const result = await confirmEmail((await searchParams).token);
  if (result.ok && !result.already) await audit(result.userId, "auth.email_verified", { type: "user", id: result.userId });
  const user = await getCurrentUser();
  const continueTo = user && user.id === (result.ok ? result.userId : -1) && !(await getPreferences(user.id)).onboarded ? "/onboarding" : "/";

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
            <Link href={user ? continueTo : "/login"} className="btn btn-primary" style={{ marginTop: 16 }}>
              {user ? "Continue to CineMind" : "Sign in"}
            </Link>
          </>
        ) : (
          <>
            <h1>Can&apos;t confirm this link</h1>
            <div className="form-error" role="alert" style={{ margin: "16px 0" }}>
              {result.error}
            </div>
            <p className="muted">{user ? "You can get a new link from your account." : "Sign in to get a new link."}</p>
            <Link href={user ? "/confirm-email" : "/login?next=%2Fconfirm-email"} className="btn btn-primary" style={{ marginTop: 12 }}>
              {user ? "Send a new link" : "Sign in"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
