import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Forgot your password?</h1>
        <p className="muted">Enter the email you signed up with and we&apos;ll send you a link to choose a new password.</p>
        <ForgotPasswordForm />
        <p className="auth-alt">
          Remembered it? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
