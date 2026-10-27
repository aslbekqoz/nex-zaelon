"use client";

import { useActionState, useEffect, useRef } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { createFact } from "@/lib/studio/actions";
import { FormMessage } from "./FormMessage";

export function FactForm({ movies, movieId }: { movies: { id: number; title: string }[]; movieId?: number }) {
  const [state, action] = useActionState(createFact, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.querySelectorAll("textarea, input[type=url], input[name=sourceTitle]").forEach((el) => ((el as HTMLInputElement).value = ""));
  }, [state]);

  return (
    <ActionForm action={action} ref={formRef} className="card-panel form">
      <h2>Add a fact</h2>
      <div className="new-options">
        <div className="field">
          <label htmlFor="movieId">Movie</label>
          <select id="movieId" name="movieId" className="select" defaultValue={movieId ?? ""} required>
            <option value="" disabled>
              Choose a movie…
            </option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="language">Language</label>
          <select id="language" name="language" className="select" defaultValue="uz">
            <option value="uz">O&apos;zbekcha (Uzbek)</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="text">Fact</label>
        <textarea id="text" name="text" className="input textarea" rows={3} required minLength={10} maxLength={600} />
      </div>
      <div className="new-options">
        <div className="field">
          <label htmlFor="sourceUrl">Source link (required)</label>
          <input id="sourceUrl" name="sourceUrl" type="url" className="input" placeholder="https://…" required />
        </div>
        <div className="field">
          <label htmlFor="sourceTitle">Source name (optional)</label>
          <input id="sourceTitle" name="sourceTitle" className="input" placeholder="e.g. BFI interview, 2014" maxLength={200} />
        </div>
      </div>
      <div className="editor-actions">
        <SubmitButton pendingText="Adding…">Add fact</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
