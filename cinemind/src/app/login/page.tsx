import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { login } from "@/lib/auth/actions";
import { getCurrentUser, safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Kirish" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Xush kelibsiz</h1>
        <p className="muted">Ro&apos;yxatingiz va tavsiyalaringizga kirish uchun akkauntingizga kiring.</p>
        <AuthForm mode="login" action={login} next={next} />
        <p className="auth-alt">
          Akkauntingiz yo&apos;qmi? <Link href={`/register?next=${encodeURIComponent(next)}`}>Ro&apos;yxatdan o&apos;ting</Link>
        </p>
      </div>
    </div>
  );
}
