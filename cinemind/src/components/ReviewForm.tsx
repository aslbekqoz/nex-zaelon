"use client";

import { useActionState, useEffect, useState } from "react";
import { REVIEW_MAX, REVIEW_MIN } from "@/lib/reviews/rules";
import { removeOwnReview, saveReview } from "@/lib/reviews/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function ReviewForm({ movieId, existing }: { movieId: number; existing: { body: string; spoilers: boolean } | null }) {
  const [saveState, save] = useActionState(saveReview, {});
  const [removeState, remove] = useActionState(removeOwnReview, {});
  const [editing, setEditing] = useState(!existing);
  const [length, setLength] = useState([...(existing?.body ?? "")].length);
  // Whichever form was used last decides the message (and whether the old text comes back)
  const [last, setLast] = useState<"save" | "remove">("save");
  const message = last === "remove" ? removeState : saveState;

  // After saving, show the published review instead of the editor
  useEffect(() => {
    if (saveState.ok) setEditing(false);
  }, [saveState]);

  if (existing && !editing) {
    return (
      <div className="tool-row" style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
          Edit review
        </button>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Delete your review?")) e.preventDefault();
            else setLast("remove");
          }}
        >
          <input type="hidden" name="movieId" value={movieId} />
          <SubmitButton className="btn btn-sm btn-ghost danger" pendingText="…">
            Delete
          </SubmitButton>
        </form>
        {message.ok ? (
          <span className="form-ok" role="status">
            {message.ok}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <ActionForm action={save} className="form review-form" onSubmit={() => setLast("save")}>
      <input type="hidden" name="movieId" value={movieId} />
      {message.error ? (
        <div className="form-error" role="alert">
          {message.error}
        </div>
      ) : message.ok ? (
        <div className="form-ok" role="status">
          {message.ok}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="review-body">{existing ? "Edit your review" : "Write a review"}</label>
        <textarea
          id="review-body"
          name="body"
          className="input"
          rows={5}
          required
          minLength={REVIEW_MIN}
          maxLength={REVIEW_MAX}
          defaultValue={existing?.body ?? ""}
          placeholder="What did you think? Share what worked and what didn't."
          onChange={(e) => setLength([...e.target.value].length)}
        />
        <span className={`faint review-count${length > REVIEW_MAX ? " danger" : ""}`}>
          {length} / {REVIEW_MAX}
        </span>
      </div>
      <label className="review-check">
        <input type="checkbox" name="spoilers" defaultChecked={existing?.spoilers ?? false} /> Contains spoilers
      </label>
      <div className="tool-row">
        <SubmitButton className="btn btn-primary" pendingText="Saving…">
          {existing ? "Save changes" : "Publish review"}
        </SubmitButton>
        {existing ? (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
        ) : null}
      </div>
    </ActionForm>
  );
}
