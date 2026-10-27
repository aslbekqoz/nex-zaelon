import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftEditor } from "@/components/studio/DraftEditor";
import { deleteDraft, duplicateDraft } from "@/lib/studio/actions";
import { aiEnabled } from "@/lib/studio/ai";
import { draftWarnings } from "@/lib/studio/generate";
import { getDraft, kindLabel, listTemplates } from "@/lib/studio/repository";

type Props = { params: Promise<{ id: string }> };

async function load(raw: string) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? getDraft(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const draft = await load((await params).id);
  return { title: draft?.title ?? "Draft" };
}

export default async function DraftPage({ params }: Props) {
  const draft = await load((await params).id);
  if (!draft) notFound();
  const [templates, { movies, warnings }] = await Promise.all([
    listTemplates({ kind: draft.kind, language: draft.language }),
    draftWarnings(draft),
  ]);

  return (
    <>
      <div className="draft-head">
        <div className="chips">
          <span className="badge">{kindLabel(draft.kind)}</span>
          <span className="badge">{draft.language === "uz" ? "O'zbekcha" : "English"}</span>
          {movies.slice(0, 6).map((m) => (
            <Link key={m.id} href={`/movies/${m.id}`} className="badge link">
              {m.title}
            </Link>
          ))}
          {movies.length > 6 ? <span className="badge">+{movies.length - 6}</span> : null}
          {draft.kind === "facts" && movies[0] ? (
            <Link href={`/studio/facts?movie=${movies[0].id}`} className="badge link">
              Manage facts →
            </Link>
          ) : null}
        </div>
        <div className="chips">
          <form action={duplicateDraft}>
            <input type="hidden" name="id" value={draft.id} />
            <button className="btn btn-sm">Duplicate</button>
          </form>
          <form action={deleteDraft}>
            <input type="hidden" name="id" value={draft.id} />
            <button className="btn btn-sm btn-ghost danger">Delete</button>
          </form>
        </div>
      </div>

      {warnings.length ? (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>⚠️ {w}</li>
          ))}
        </ul>
      ) : null}

      <DraftEditor draft={draft} templates={templates} aiAvailable={aiEnabled()} />
    </>
  );
}
