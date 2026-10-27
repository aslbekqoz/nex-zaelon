import type { Metadata } from "next";
import Link from "next/link";
import { audit } from "@/lib/audit";
import { confirmEmailChange } from "@/lib/auth/change-email";
import { getCurrentUser } from "@/lib/auth/session";

// The token is in the URL: keep it out of Referer headers and search engines
export const metadata: Metadata = { title: "Confirm new email", referrer: "no-referrer", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ConfirmEmailChangePage({ searchParams }: Props) {
  const result = await confirmEmailChange((await searchParams).token);
  if (result.ok && !result.already) {
    await audit(result.userId, "auth.email_changed", { type: "user", id: result.userId }, { from: result.oldEmail, to: result.email });
  }
  const user = await getCurrentUser();

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {result.ok ? (
          <>
            <h1>Email changed ✓</h1>
            <p className="muted">
              Your account now uses <strong style={{ overflowWrap: "anywhere" }}>{result.email}</strong>
              {result.already ? " (this change was already confirmed)." : ". Use it the next time you sign in."}
            </p>
            <Link href={user ? "/account" : "/login"} className="btn btn-primary" style={{ marginTop: 16 }}>
              {user ? "Back to your account" : "Sign in"}
            </Link>
          </>
        ) : (
          <>
            <h1>Can&apos;t change the email</h1>
            <div className="form-error" role="alert" style={{ margin: "16px 0" }}>
              {result.error}
            </div>
            <Link href={user ? "/account" : "/login?next=%2Faccount"} className="btn btn-primary">
              {user ? "Go to your account" : "Sign in"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
