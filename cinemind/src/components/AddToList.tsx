"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addToListAction } from "@/lib/lists/actions";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function AddToList({ movieId, lists }: { movieId: number; lists: { id: number; title: string; has: boolean }[] }) {
  const [state, action] = useActionState(addToListAction, {});
  if (!lists.length) {
    return (
      <p className="add-to-list faint">
        <Link href={`/lists?movie=${movieId}`} className="link">
          Start a list
        </Link>{" "}
        with this movie.
      </p>
    );
  }
  return (
    <ActionForm action={action} className="add-to-list tool-row">
      <input type="hidden" name="movieId" value={movieId} />
      <label htmlFor="add-to-list" className="sr-only">
        Add to a list
      </label>
      <select id="add-to-list" name="listId" className="select select-sm" defaultValue={lists.find((l) => !l.has)?.id ?? lists[0].id}>
        {lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.has ? `✓ ${l.title}` : l.title}
          </option>
        ))}
      </select>
      <SubmitButton className="btn btn-sm" pendingText="…">
        Add to list
      </SubmitButton>
      <Link href={`/lists?movie=${movieId}`} className="link faint" style={{ fontSize: 13 }}>
        New list
      </Link>
      {state.error ? (
        <span className="form-error" role="alert">
          {state.error}
        </span>
      ) : state.ok ? (
        <span className="form-ok" role="status">
          {state.ok}
        </span>
      ) : null}
    </ActionForm>
  );
}
