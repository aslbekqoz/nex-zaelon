"use client";

import { useActionState } from "react";
import type { AuthState } from "@/lib/auth/actions";
import { SubmitButton } from "./SubmitButton";

type Props = {
  mode: "login" | "register";
  action: (state: AuthState, form: FormData) => Promise<AuthState>;
  next: string;
};

export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="form">
      <input type="hidden" name="next" value={next} />
      {state.error ? (
        <div className="form-error" role="alert">
          {state.error}
        </div>
      ) : null}
      {mode === "register" ? (
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" className="input" required minLength={2} maxLength={60} defaultValue={state.name} autoComplete="name" />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required defaultValue={state.email} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === "register" ? 8 : undefined}
          maxLength={72}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>
      <SubmitButton pendingText="Please wait…">{mode === "register" ? "Create account" : "Sign in"}</SubmitButton>
    </form>
  );
}
