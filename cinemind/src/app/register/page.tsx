import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { register } from "@/lib/auth/actions";
import { getCurrentUser, safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ro'yxatdan o'tish" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Akkaunt yaratish</h1>
        <p className="muted">Filmlarni ro&apos;yxatga saqlang va shaxsiy tavsiyalar oling.</p>
        <AuthForm mode="register" action={register} next={next} />
        <p className="auth-alt">
          Akkauntingiz bormi? <Link href={`/login?next=${encodeURIComponent(next)}`}>Kirish</Link>
        </p>
      </div>
    </div>
  );
}
