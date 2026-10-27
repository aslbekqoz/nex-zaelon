import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { login } from "@/lib/auth/actions";
import { getCurrentUser, safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to access your watchlist and recommendations.</p>
        <AuthForm mode="login" action={login} next={next} />
        <p className="auth-alt">
          Don&apos;t have an account? <Link href={`/register?next=${encodeURIComponent(next)}`}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
