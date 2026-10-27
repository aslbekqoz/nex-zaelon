"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/auth/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, {});
  return (
    <ActionForm action={action} className="form">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <div className="form-error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" className="input" required minLength={8} maxLength={72} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="confirm">Repeat new password</label>
        <input id="confirm" name="confirm" type="password" className="input" required minLength={8} maxLength={72} autoComplete="new-password" />
      </div>
      <SubmitButton pendingText="Saving…">Set new password</SubmitButton>
    </ActionForm>
  );
}
