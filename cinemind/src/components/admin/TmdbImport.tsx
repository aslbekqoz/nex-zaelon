"use client";

import { useActionState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { FormMessage } from "@/components/studio/FormMessage";
import { importFromTmdb } from "@/lib/admin/actions";

export function TmdbImport({ lists }: { lists: { key: string; label: string }[] }) {
  const [state, action] = useActionState(importFromTmdb, {});
  return (
    <ActionForm action={action} className="card-panel import-panel">
      <h2>Import from TMDB</h2>
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        Adds movies from a TMDB list (20 per page). Existing movies are refreshed unless you edited them by hand. Uzbek titles and
        synopses are never overwritten.
      </p>
      <div className="tool-row">
        <label className="sr-only" htmlFor="list">
          List
        </label>
        <select id="list" name="list" className="select" defaultValue="trending">
          {lists.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="pages">
          Pages
        </label>
        <select id="pages" name="pages" className="select" defaultValue="1" style={{ flex: "0 1 140px" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n * 20} movies
            </option>
          ))}
        </select>
        <SubmitButton pendingText="Importing…">Import</SubmitButton>
      </div>
      <div style={{ marginTop: 10 }}>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
