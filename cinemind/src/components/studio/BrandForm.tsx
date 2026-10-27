"use client";

import { useActionState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { saveBrandSettings } from "@/lib/studio/actions";
import type { BrandSettings } from "@/lib/studio/context";
import { FormMessage } from "./FormMessage";

const TOGGLES: { name: keyof BrandSettings; label: string }[] = [
  { name: "includeRating", label: "Rating" },
  { name: "includeRuntime", label: "Runtime" },
  { name: "includeGenres", label: "Genres" },
  { name: "includeDirector", label: "Director" },
  { name: "includeTrailer", label: "Trailer link" },
];

export function BrandForm({ brand }: { brand: BrandSettings }) {
  const [state, action] = useActionState(saveBrandSettings, {});
  return (
    <ActionForm action={action} className="card-panel form" style={{ maxWidth: 720 }}>
      <div className="field">
        <label htmlFor="brandName">Brand name</label>
        <input id="brandName" name="brandName" className="input" defaultValue={brand.brandName} required maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="signature">Signature (added where templates use {"{{signature}}"})</label>
        <textarea id="signature" name="signature" className="input textarea" rows={3} defaultValue={brand.signature} maxLength={500} />
      </div>
      <div className="field">
        <label htmlFor="hashtags">Hashtags ({"{{hashtags}}"})</label>
        <input id="hashtags" name="hashtags" className="input" defaultValue={brand.hashtags} maxLength={300} />
      </div>
      <div className="field">
        <label htmlFor="siteUrl">Site URL for movie links ({"{{url}}"}, optional)</label>
        <input id="siteUrl" name="siteUrl" type="url" className="input" defaultValue={brand.siteUrl} placeholder="https://cinemind.uz" />
      </div>
      <fieldset className="field toggles">
        <legend>Include in posts</legend>
        {TOGGLES.map((t) => (
          <label key={t.name} className="check-row">
            <input type="checkbox" name={t.name} defaultChecked={Boolean(brand[t.name])} /> {t.label}
          </label>
        ))}
      </fieldset>
      <div className="editor-actions">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
