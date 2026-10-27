"use client";

import { useActionState, useMemo, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { saveTemplate } from "@/lib/studio/actions";
import type { ContentKind, Language } from "@/lib/studio/context";
import { toHtml } from "@/lib/studio/format";
import { renderTemplate, type TemplateContext } from "@/lib/studio/render";
import type { Template } from "@/lib/studio/repository";
import { FormMessage } from "./FormMessage";

type Props = {
  template?: Template;
  kind: ContentKind;
  language: Language;
  kinds: { value: ContentKind; label: string }[];
  sample: TemplateContext;
};

export function TemplateForm({ template, kind, language, kinds, sample }: Props) {
  const [state, action] = useActionState(saveTemplate, {});
  const [body, setBody] = useState(template?.body ?? "");
  // A template without an id is only a starting point for a new one
  const editing = Boolean(template && template.id > 0);
  const preview = useMemo(() => {
    try {
      return toHtml(renderTemplate(body, sample));
    } catch {
      return "";
    }
  }, [body, sample]);

  return (
    <form action={action} className="editor">
      <div className="editor-main">
        {editing ? <input type="hidden" name="id" value={template!.id} /> : null}
        <div className="new-options">
          <div className="field">
            <label htmlFor="kind">Content type</label>
            <select id="kind" name="kind" className="select" defaultValue={kind} disabled={editing}>
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            {editing ? <input type="hidden" name="kind" value={kind} /> : null}
          </div>
          <div className="field">
            <label htmlFor="language">Language</label>
            <select id="language" name="language" className="select" defaultValue={language} disabled={editing}>
              <option value="uz">O&apos;zbekcha (Uzbek)</option>
              <option value="en">English</option>
            </select>
            {editing ? <input type="hidden" name="language" value={language} /> : null}
          </div>
        </div>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" className="input" defaultValue={template?.name} required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="body">Template</label>
          <textarea id="body" name="body" className="input textarea mono" rows={18} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <label className="check-row">
          <input type="checkbox" name="isDefault" defaultChecked={template?.isDefault} /> Use as the default for this type and language
        </label>
        <div className="editor-actions">
          <SubmitButton pendingText="Saving…">{editing ? "Save template" : "Create template"}</SubmitButton>
          <FormMessage state={state} />
        </div>
      </div>
      <aside className="editor-side">
        <div className="preview-head">
          <h2>Preview with sample data</h2>
        </div>
        <div className="preview" dangerouslySetInnerHTML={{ __html: preview }} />
      </aside>
    </form>
  );
}
