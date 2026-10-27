"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/auth/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  if (state.ok) {
    return (
      <div className="form-ok" role="status" style={{ marginTop: 12 }}>
        {state.ok}
      </div>
    );
  }
  return (
    <ActionForm action={action} className="form" style={{ marginTop: 12 }}>
      {state.error ? (
        <div className="form-error" role="alert">
          {state.error}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="pw-current">Current password</label>
        <input id="pw-current" name="current" type="password" className="input" required autoComplete="current-password" />
      </div>
      <div className="field">
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" name="password" type="password" className="input" required minLength={8} maxLength={72} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="pw-confirm">Repeat new password</label>
        <input id="pw-confirm" name="confirm" type="password" className="input" required minLength={8} maxLength={72} autoComplete="new-password" />
      </div>
      <SubmitButton pendingText="Saving…">Change password</SubmitButton>
    </ActionForm>
  );
}
