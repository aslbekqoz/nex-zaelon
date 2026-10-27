"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/auth/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, {});
  if (state.ok) {
    return (
      <div className="form-ok" role="status" style={{ marginTop: 24 }}>
        {state.ok}
      </div>
    );
  }
  return (
    <ActionForm action={action} className="form">
      {state.error ? (
        <div className="form-error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required defaultValue={state.email} autoComplete="email" />
      </div>
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </ActionForm>
  );
}
