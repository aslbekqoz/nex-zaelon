"use client";

import { useActionState, useState } from "react";
import { Poster } from "@/components/Poster";
import { SubmitButton } from "@/components/SubmitButton";
import type { Movie } from "@/lib/movies/types";
import type { Mood } from "@/lib/recommend/moods";
import { createDraft } from "@/lib/studio/actions";
import type { ContentKind, Language } from "@/lib/studio/context";
import type { Template } from "@/lib/studio/repository";
import { FormMessage } from "./FormMessage";

type Props = {
  kind: ContentKind;
  movies: Movie[];
  templates: Template[];
  moods: Mood[];
  initialLanguage: Language;
};

export function NewDraftForm({ kind, movies, templates, moods, initialLanguage }: Props) {
  const [state, action] = useActionState(createDraft, {});
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const weekly = kind === "weekly";
  const options = templates.filter((t) => t.kind === kind && t.language === language);

  return (
    <form action={action}>
      <input type="hidden" name="kind" value={kind} />
      <div className="new-options">
        <div className="field">
          <label htmlFor="language">Language</label>
          <select id="language" name="language" className="select" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            <option value="uz">O&apos;zbekcha (Uzbek)</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="templateId">Template</label>
          <select id="templateId" name="templateId" className="select" key={language}>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
        {weekly ? (
          <div className="field">
            <label htmlFor="mood">Auto-pick mood (when no movies are ticked)</label>
            <select id="mood" name="mood" className="select" defaultValue="">
              <option value="">Best overall</option>
              {moods.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <p className="muted" style={{ margin: "18px 0 12px" }}>
        {weekly
          ? "Tick up to 15 movies in the order you want them, or leave all unticked to auto-pick 7 with the recommendation engine."
          : "Choose the movie."}
      </p>
      {movies.length ? (
        <div className="grid">
          {movies.map((m) => (
            <label key={m.id} className="pick pick-card">
              <input type={weekly ? "checkbox" : "radio"} name="movie" value={m.id} required={!weekly} />
              <span className="check" aria-hidden>
                ✓
              </span>
              <Poster movie={m} showRating={false} />
              <span className="card-title">{m.title}</span>
              {m.titleUz && m.titleUz !== m.title ? <span className="card-sub">{m.titleUz}</span> : null}
            </label>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>No movies found</h2>
          <p>Try another search.</p>
        </div>
      )}

      <div className="sticky-submit">
        <SubmitButton className="btn btn-primary btn-lg" pendingText="Creating…">
          Create draft
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
