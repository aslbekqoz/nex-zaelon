"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { aiWriteDraft, regenerateDraft, saveDraft } from "@/lib/studio/actions";
import { toHtml } from "@/lib/studio/format";
import type { Draft, Template } from "@/lib/studio/repository";
import { copyBody, type CopyFormat } from "./copy";
import { FormMessage } from "./FormMessage";

type Props = {
  draft: Draft;
  templates: Template[];
  aiAvailable: boolean;
};

const COPY_LABELS: Record<CopyFormat, string> = {
  plain: "Copy text",
  markdown: "Copy Markdown",
  rich: "Copy formatted",
};

export function DraftEditor({ draft, templates, aiAvailable }: Props) {
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [status, setStatus] = useState(draft.status);
  const [copied, setCopied] = useState<string | null>(null);
  const [saveState, saveAction] = useActionState(saveDraft, {});
  const [regenState, regenAction] = useActionState(regenerateDraft, {});
  const [aiState, aiAction] = useActionState(aiWriteDraft, {});

  // Regenerate / AI replace the body on the server; pick up the new text when it arrives
  useEffect(() => setBody(draft.body), [draft.body]);
  useEffect(() => setTitle(draft.title), [draft.title]);
  useEffect(() => setStatus(draft.status), [draft.status]);

  const dirty = title !== draft.title || body !== draft.body || status !== draft.status;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function onCopy(format: CopyFormat) {
    const ok = await copyBody(body, format);
    setCopied(ok ? `${COPY_LABELS[format].replace("Copy ", "")} copied` : "Copy failed — select the preview and copy manually");
    setTimeout(() => setCopied(null), 2500);
  }

  const confirmReplace = (e: React.FormEvent) => {
    if (dirty && !confirm("This replaces the text with a fresh version. Unsaved edits will be lost. Continue?")) e.preventDefault();
  };

  return (
    <div className="editor">
      <form action={saveAction} className="editor-main">
        <input type="hidden" name="id" value={draft.id} />
        <div className="field">
          <label htmlFor="title">Title (internal)</label>
          <input id="title" name="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="body">
            Text <span className="faint">· **bold**, _italic_, links stay as typed</span>
          </label>
          <textarea
            id="body"
            name="body"
            className="input textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            spellCheck
            lang={draft.language}
          />
          <div className="editor-meta faint">
            {body.length} characters · {body.split(/\s+/).filter(Boolean).length} words
            {dirty ? <span className="unsaved"> · unsaved changes</span> : null}
          </div>
        </div>
        <div className="editor-actions">
          <label className="sr-only" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="draft">Draft</option>
            <option value="ready">Ready to use</option>
            <option value="archived">Archived</option>
          </select>
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
          <FormMessage state={saveState} />
        </div>
      </form>

      <aside className="editor-side">
        <div className="preview-head">
          <h2>Preview</h2>
          <div className="copy-buttons">
            {(Object.keys(COPY_LABELS) as CopyFormat[]).map((f) => (
              <button key={f} type="button" className="btn btn-sm" onClick={() => onCopy(f)}>
                {COPY_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="preview" lang={draft.language} dangerouslySetInnerHTML={{ __html: toHtml(body) }} />
        <p className="faint copy-status" role="status">
          {copied ?? "Copied text is yours to post anywhere — CineMind never publishes automatically."}
        </p>

        <div className="side-tools">
          <form action={regenAction} onSubmit={confirmReplace} className="tool-row">
            <input type="hidden" name="id" value={draft.id} />
            <label className="sr-only" htmlFor="templateId">
              Template
            </label>
            <select id="templateId" name="templateId" className="select" defaultValue={draft.templateId ?? ""}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            <SubmitButton className="btn" pendingText="Regenerating…">
              Regenerate
            </SubmitButton>
          </form>
          <FormMessage state={regenState} />

          {aiAvailable && (draft.kind === "description" || draft.kind === "movie_card") ? (
            <>
              <form action={aiAction} onSubmit={confirmReplace} className="tool-row">
                <input type="hidden" name="id" value={draft.id} />
                <SubmitButton className="btn" pendingText="Writing…">
                  ✨ Write synopsis with AI
                </SubmitButton>
                <span className="faint" style={{ fontSize: 13 }}>
                  Uses only the movie data; always review before use.
                </span>
              </form>
              <FormMessage state={aiState} />
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
