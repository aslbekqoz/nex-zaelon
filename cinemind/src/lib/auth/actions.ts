"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { createSession, destroySession, safeNextPath } from "./session";

export type AuthState = { error?: string; email?: string; name?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = field(form, "name");
  const email = field(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const next = safeNextPath(form.get("next"));

  if (name.length < 2 || name.length > 60) return { error: "Ism 2–60 belgidan iborat bo'lsin.", email, name };
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: "Email manzili noto'g'ri.", email, name };
  if (password.length < 8) return { error: "Parol kamida 8 belgidan iborat bo'lsin.", email, name };
  if (password.length > 72) return { error: "Parol 72 belgidan oshmasin.", email, name };

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query<{ id: number }>(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, name, hash],
  );
  if (!rows[0]) return { error: "Bu email bilan akkaunt allaqachon mavjud.", email, name };

  await createSession(rows[0].id);
  redirect(next);
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email").toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const next = safeNextPath(form.get("next"));

  const { rows } = await query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );
  const ok = rows[0] ? await bcrypt.compare(password, rows[0].password_hash) : false;
  if (!rows[0] || !ok) return { error: "Email yoki parol noto'g'ri.", email };

  await createSession(rows[0].id);
  redirect(next);
}

export async function logout() {
  await destroySession();
  redirect("/");
}
