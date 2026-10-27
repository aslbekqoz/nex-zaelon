"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/lib/auth/actions";
import { DELETE_CONFIRMATION } from "@/lib/auth/delete-account";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, {});
  // The form stays folded away until asked for, so it can't be submitted by accident
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn btn-danger" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>
        Delete my account…
      </button>
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
        <label htmlFor="del-password">Current password</label>
        <input id="del-password" name="password" type="password" className="input" required autoComplete="current-password" />
      </div>
      <div className="field">
        <label htmlFor="del-confirm">Type {DELETE_CONFIRMATION} to confirm</label>
        <input id="del-confirm" name="confirm" className="input" required autoComplete="off" spellCheck={false} />
      </div>
      <div className="tool-row">
        <SubmitButton className="btn btn-danger" pendingText="Deleting…">
          Delete account permanently
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </ActionForm>
  );
}
