"use client";

import { useActionState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/studio/FormMessage";
import { saveMovie } from "@/lib/admin/actions";
import type { Genre } from "@/lib/movies/types";

export type MovieFormValues = {
  id?: number;
  tmdbId?: number | null;
  title?: string;
  titleUz?: string | null;
  originalTitle?: string | null;
  overview?: string | null;
  overviewUz?: string | null;
  director?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  originalLanguage?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  trailerKey?: string | null;
  genreIds?: number[];
  syncLocked?: boolean;
};

type FieldProps = { name: string; label: string; initial?: string | number | null; hint?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "value" | "defaultValue"
>;

function Field({ name, label, initial, hint, ...rest }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" defaultValue={initial ?? ""} {...rest} />
      {hint ? <span className="faint field-hint">{hint}</span> : null}
    </div>
  );
}

function Area({ name, label, value, lang }: { name: string; label: string; value?: string | null; lang?: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} className="input textarea" rows={5} defaultValue={value ?? ""} maxLength={5000} lang={lang} />
    </div>
  );
}

export function MovieForm({ movie, genres }: { movie: MovieFormValues; genres: Genre[] }) {
  const [state, action] = useActionState(saveMovie, {});
  const selected = new Set(movie.genreIds ?? []);
  return (
    <ActionForm action={action} className="card-panel form">
      {movie.id ? <input type="hidden" name="id" value={movie.id} /> : null}
      <div className="new-options">
        <Field name="title" label="Title (English)" initial={movie.title} required maxLength={300} />
        <Field name="titleUz" label="Uzbek title" initial={movie.titleUz} maxLength={300} lang="uz" />
        <Field name="originalTitle" label="Original title" initial={movie.originalTitle} maxLength={300} />
      </div>
      <div className="new-options">
        <Area name="overview" label="Synopsis (English)" value={movie.overview} />
        <Area name="overviewUz" label="Uzbek synopsis" value={movie.overviewUz} lang="uz" />
      </div>
      <div className="new-options">
        <Field name="director" label="Director(s)" initial={movie.director} maxLength={300} hint="Separate several with commas" />
        <Field name="releaseDate" label="Release date" initial={movie.releaseDate} placeholder="YYYY or YYYY-MM-DD" maxLength={10} />
        <Field name="runtime" label="Runtime (minutes)" initial={movie.runtime} inputMode="numeric" maxLength={4} />
        <Field name="originalLanguage" label="Original language" initial={movie.originalLanguage} placeholder="en" maxLength={3} />
      </div>
      <div className="new-options">
        <Field name="posterUrl" label="Poster image URL" initial={movie.posterUrl} type="url" />
        <Field name="backdropUrl" label="Backdrop image URL" initial={movie.backdropUrl} type="url" />
        <Field
          name="trailer"
          label="Trailer"
          initial={movie.trailerKey ? `https://www.youtube.com/watch?v=${movie.trailerKey}` : ""}
          placeholder="YouTube link or video id"
        />
      </div>
      <fieldset className="field toggles">
        <legend>Genres</legend>
        <div className="chips">
          {genres.map((g) => (
            <label key={g.id} className="chip pick">
              <input type="checkbox" name="genre" value={g.id} defaultChecked={selected.has(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
      </fieldset>
      {movie.tmdbId ? (
        <label className="check-row">
          <input type="checkbox" name="syncLocked" defaultChecked={movie.syncLocked ?? true} /> Keep my edits — don&apos;t refresh this movie
          from TMDB (TMDB #{movie.tmdbId})
        </label>
      ) : null}
      <div className="editor-actions">
        <SubmitButton pendingText="Saving…">{movie.id ? "Save movie" : "Add movie"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
