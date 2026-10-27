import "server-only";
import { listMoviesByIds } from "@/lib/movies/repository";
import { buildContext, draftTitle, movieWarnings, type ContentKind, type Language } from "./context";
import { renderTemplate } from "./render";
import { getBrandSettings, getDefaultTemplate, getTemplate, verifiedFacts, type Template } from "./repository";

/** Renders a draft body from a template and the current movie, fact and brand data. */
export async function generateDraft(input: {
  kind: ContentKind;
  language: Language;
  movieIds: number[];
  templateId?: number | null;
  /** Replaces the synopsis (e.g. with AI-written or hand-edited text) while keeping the template. */
  overviewOverride?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const [movies, brand, chosen] = await Promise.all([
    listMoviesByIds(input.movieIds),
    getBrandSettings(),
    input.templateId ? getTemplate(input.templateId) : Promise.resolve(null),
  ]);
  if (!movies.length) throw new Error("Pick at least one movie.");

  const template: Template | null =
    chosen && chosen.kind === input.kind ? chosen : await getDefaultTemplate(input.kind, input.language);
  if (!template) throw new Error("No template exists for this content type and language.");

  const facts = input.kind === "facts" ? await verifiedFacts(movies[0].id, input.language) : [];
  const context = buildContext({ kind: input.kind, lang: input.language, movies, facts, brand, now });
  if (input.overviewOverride && input.kind !== "weekly") context.overview = input.overviewOverride;

  return {
    title: draftTitle(input.kind, input.language, movies, now),
    body: renderTemplate(template.body, context),
    templateId: template.id,
    movieIds: movies.map((m) => m.id),
  };
}

/** Editorial warnings for a draft, computed from current data (shown in the editor only). */
export async function draftWarnings(draft: { kind: ContentKind; language: Language; movieIds: number[] }) {
  const movies = await listMoviesByIds(draft.movieIds);
  const warnings = movies.flatMap((m) => movieWarnings(m, draft.language));
  if (draft.kind === "facts" && movies[0] && !(await verifiedFacts(movies[0].id, draft.language)).length) {
    warnings.push(
      `No verified ${draft.language === "uz" ? "Uzbek" : "English"} facts for “${movies[0].title}” yet. Add facts with sources in the Facts library, verify them, then regenerate.`,
    );
  }
  if (draft.movieIds.length > movies.length) warnings.push("Some movies in this draft no longer exist in the catalogue.");
  return { movies, warnings };
}
