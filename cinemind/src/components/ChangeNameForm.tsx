"use client";

import { useActionState } from "react";
import { changeName } from "@/lib/auth/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function ChangeNameForm({ current }: { current: string }) {
  const [state, action] = useActionState(changeName, {});
  return (
    <ActionForm action={action} className="form" style={{ marginTop: 12 }}>
      {state.error ? (
        <div className="form-error" role="alert">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="form-ok" role="status">
          {state.ok}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="display-name">Name</label>
        <input
          // Remount with the tidied value the server returned, so the field shows what was saved
          key={state.name ?? current}
          id="display-name"
          name="name"
          className="input"
          required
          minLength={2}
          maxLength={60}
          defaultValue={state.name ?? current}
          autoComplete="name"
        />
      </div>
      <SubmitButton pendingText="Saving…">Save name</SubmitButton>
    </ActionForm>
  );
}
