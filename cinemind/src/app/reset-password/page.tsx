import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { checkResetToken } from "@/lib/auth/reset";

// The token is in the URL: keep it out of Referer headers and search engines
export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const token = (await searchParams).token;
  const check = await checkResetToken(token);
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {check.ok ? (
          <>
            <h1>Choose a new password</h1>
            <p className="muted">
              For {check.name}. You&apos;ll be signed out on every other device and signed in here.
            </p>
            <ResetPasswordForm token={token!} />
          </>
        ) : (
          <>
            <h1>Can&apos;t use this link</h1>
            <div className="form-error" role="alert" style={{ margin: "16px 0" }}>
              {check.error}
            </div>
            <p className="muted">Reset links work once and expire after an hour. You can ask for a new one.</p>
            <Link href="/forgot-password" className="btn btn-primary" style={{ marginTop: 12 }}>
              Send a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
