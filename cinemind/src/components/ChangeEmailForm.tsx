"use client";

import { useActionState } from "react";
import { requestEmailChange } from "@/lib/auth/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function ChangeEmailForm() {
  const [state, action] = useActionState(requestEmailChange, {});
  if (state.ok) {
    return (
      <div className="form-ok" role="status">
        {state.ok} Reload this page to see the pending change.
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
        <label htmlFor="new-email">New email address</label>
        <input id="new-email" name="email" type="email" className="input" required defaultValue={state.email} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="current-password">Current password</label>
        <input id="current-password" name="password" type="password" className="input" required autoComplete="current-password" />
      </div>
      <SubmitButton pendingText="Sending…">Send confirmation link</SubmitButton>
    </ActionForm>
  );
}
