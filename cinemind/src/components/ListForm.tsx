"use client";

import { useActionState } from "react";
import { createListAction, updateListAction } from "@/lib/lists/actions";
import { LIST_DESCRIPTION_MAX, LIST_TITLE_MAX } from "@/lib/lists/rules";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

type Existing = { id: number; title: string; description: string; isPublic: boolean };

/** Creates a list (optionally adding a movie to it), or edits one when `existing` is given. */
export function ListForm({ existing, movieId }: { existing?: Existing; movieId?: number }) {
  const [state, action] = useActionState(existing ? updateListAction : createListAction, {});
  const prefix = existing ? `list-${existing.id}` : "new-list";
  return (
    <ActionForm action={action} className="form list-form">
      {existing ? <input type="hidden" name="listId" value={existing.id} /> : null}
      {movieId ? <input type="hidden" name="movieId" value={movieId} /> : null}
      {state.error ? (
        <div className="form-error" role="alert">
          {state.error}
        </div>
      ) : state.ok ? (
        <div className="form-ok" role="status">
          {state.ok}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor={`${prefix}-title`}>Title</label>
        <input id={`${prefix}-title`} name="title" className="input" required minLength={2} maxLength={LIST_TITLE_MAX} defaultValue={existing?.title} placeholder="e.g. Best films of the 90s" />
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-description`}>Description (optional)</label>
        <textarea id={`${prefix}-description`} name="description" className="input" rows={3} maxLength={LIST_DESCRIPTION_MAX} defaultValue={existing?.description} />
      </div>
      <label className="review-check">
        <input type="checkbox" name="public" defaultChecked={existing?.isPublic ?? false} /> Public: anyone with the link can see it, and it shows on your profile
      </label>
      <SubmitButton pendingText="Saving…">{existing ? "Save list" : movieId ? "Create list and add the movie" : "Create list"}</SubmitButton>
    </ActionForm>
  );
}
