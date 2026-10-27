"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireEditor } from "@/lib/auth/session";
import { db, query } from "@/lib/db";
import { getMovie } from "@/lib/movies/repository";
import { findMood } from "@/lib/recommend/moods";
import { getRecommendations } from "@/lib/recommend/service";
import { AiUnavailableError, writeDescription } from "./ai";
import type { ContentKind, Language } from "./context";
import { generateDraft } from "./generate";
import { placeholders } from "./render";
import { getDraft } from "./repository";

export type FormState = { error?: string; ok?: string };

const KINDS: ContentKind[] = ["movie_card", "description", "weekly", "facts"];
const LANGS: Language[] = ["uz", "en"];

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function id(form: FormData, key = "id") {
  const n = Number(form.get(key));
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`Invalid ${key}`);
  return n;
}
function kindOf(form: FormData) {
  const k = str(form, "kind") as ContentKind;
  if (!KINDS.includes(k)) throw new Error("Invalid content type");
  return k;
}
function langOf(form: FormData) {
  const l = str(form, "language") as Language;
  if (!LANGS.includes(l)) throw new Error("Invalid language");
  return l;
}

// ---------- Drafts ----------

export async function createDraft(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireEditor();
  const kind = kindOf(form);
  const language = langOf(form);
  const templateId = Number(form.get("templateId")) || null;
  let movieIds = [...new Set(form.getAll("movie").map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))];

  if (kind === "weekly") {
    if (!movieIds.length) {
      // Auto-pick: the recommendation engine's cold-start ranking, optionally steered by a mood
      const { items } = await getRecommendations({ userId: null, mood: findMood(str(form, "mood")), limit: 7 });
      movieIds = items.map((i) => i.movie.id);
    }
    movieIds = movieIds.slice(0, 15);
  } else {
    movieIds = movieIds.slice(0, 1);
  }
  if (!movieIds.length) return { error: kind === "weekly" ? "No movies to pick from." : "Pick a movie." };

  let generated;
  try {
    generated = await generateDraft({ kind, language, movieIds, templateId });
  } catch (err) {
    return { error: (err as Error).message };
  }
  const { rows } = await query<{ id: number }>(
    `INSERT INTO studio_drafts (kind, language, title, body, movie_ids, template_id, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING id`,
    [kind, language, generated.title, generated.body, generated.movieIds, generated.templateId, user.id],
  );
  await audit(user.id, "draft.create", { type: "draft", id: rows[0].id }, { kind, language, movies: generated.movieIds.length });
  revalidatePath("/studio");
  redirect(`/studio/drafts/${rows[0].id}`);
}

export async function saveDraft(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireEditor();
  const draftId = id(form);
  const title = str(form, "title");
  const body = typeof form.get("body") === "string" ? (form.get("body") as string).replace(/\r\n/g, "\n") : "";
  const status = str(form, "status");
  if (!title) return { error: "Title can't be empty." };
  if (title.length > 200) return { error: "Title is too long (200 characters max)." };
  if (body.length > 20000) return { error: "Text is too long (20,000 characters max)." };
  if (!["draft", "ready", "archived"].includes(status)) return { error: "Invalid status." };
  await query(
    "UPDATE studio_drafts SET title = $2, body = $3, status = $4, updated_by = $5, updated_at = now() WHERE id = $1",
    [draftId, title, body, status, user.id],
  );
  revalidatePath("/studio");
  revalidatePath(`/studio/drafts/${draftId}`);
  return { ok: "Saved" };
}

/** Re-renders the body from its template with the latest movie, fact and brand data. */
export async function regenerateDraft(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireEditor();
  const draft = await getDraft(id(form));
  if (!draft) return { error: "Draft not found." };
  try {
    const g = await generateDraft({
      kind: draft.kind,
      language: draft.language,
      movieIds: draft.movieIds,
      templateId: Number(form.get("templateId")) || draft.templateId,
    });
    await query(
      "UPDATE studio_drafts SET body = $2, template_id = $3, updated_by = $4, updated_at = now() WHERE id = $1",
      [draft.id, g.body, g.templateId, user.id],
    );
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath(`/studio/drafts/${draft.id}`);
  return { ok: "Regenerated from template" };
}

/** Optional: lets the AI write the synopsis, then re-renders the template around it. */
export async function aiWriteDraft(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireEditor();
  const draft = await getDraft(id(form));
  if (!draft) return { error: "Draft not found." };
  if (draft.kind !== "description" && draft.kind !== "movie_card") {
    return { error: "AI writing is available for movie cards and descriptions." };
  }
  const movie = await getMovie(draft.movieIds[0]);
  if (!movie) return { error: "The movie for this draft no longer exists." };
  try {
    const text = await writeDescription(movie, draft.language, draft.body);
    const g = await generateDraft({
      kind: draft.kind,
      language: draft.language,
      movieIds: draft.movieIds,
      templateId: draft.templateId,
      overviewOverride: text,
    });
    await query("UPDATE studio_drafts SET body = $2, updated_by = $3, updated_at = now() WHERE id = $1", [
      draft.id,
      g.body,
      user.id,
    ]);
    await audit(user.id, "draft.ai_write", { type: "draft", id: draft.id });
  } catch (err) {
    if (err instanceof AiUnavailableError) return { error: err.message };
    console.error("[studio] AI writing failed:", err);
    return { error: "AI writing failed. Please try again or write the text manually." };
  }
  revalidatePath(`/studio/drafts/${draft.id}`);
  return { ok: "AI draft ready — review it before using it" };
}

export async function duplicateDraft(form: FormData) {
  const user = await requireEditor();
  const { rows } = await query<{ id: number }>(
    `INSERT INTO studio_drafts (kind, language, title, body, movie_ids, template_id, created_by, updated_by)
     SELECT kind, language, title || ' (copy)', body, movie_ids, template_id, $2, $2 FROM studio_drafts WHERE id = $1
     RETURNING id`,
    [id(form), user.id],
  );
  if (!rows[0]) redirect("/studio");
  revalidatePath("/studio");
  redirect(`/studio/drafts/${rows[0].id}`);
}

export async function deleteDraft(form: FormData) {
  const user = await requireEditor();
  const { rows } = await query<{ id: number; title: string }>("DELETE FROM studio_drafts WHERE id = $1 RETURNING id, title", [id(form)]);
  if (rows[0]) await audit(user.id, "draft.delete", { type: "draft", id: rows[0].id }, { title: rows[0].title });
  revalidatePath("/studio");
  redirect("/studio");
}

// ---------- Templates ----------

/** Checks that every {{#x}} / {{^x}} has a matching {{/x}}. */
function templateError(body: string) {
  const stack: string[] = [];
  for (const m of body.matchAll(/\{\{\s*([#^/])\s*([\w.]+)\s*\}\}/g)) {
    if (m[1] !== "/") stack.push(m[2]);
    else if (stack.pop() !== m[2]) return `Block {{/${m[2]}}} doesn't match an opening {{#${m[2]}}}.`;
  }
  return stack.length ? `Block {{#${stack.at(-1)}}} is never closed with {{/${stack.at(-1)}}}.` : null;
}

export async function saveTemplate(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireEditor();
  const templateId = Number(form.get("id")) || null;
  const kind = kindOf(form);
  const language = langOf(form);
  const name = str(form, "name");
  const body = (typeof form.get("body") === "string" ? (form.get("body") as string) : "").replace(/\r\n/g, "\n").trim();
  const isDefault = form.get("isDefault") === "on";
  if (!name) return { error: "Give the template a name." };
  if (!body) return { error: "The template body is empty." };
  if (body.length > 10000) return { error: "Template is too long (10,000 characters max)." };
  const err = templateError(body);
  if (err) return { error: err };
  if (!placeholders(body).length) return { error: "The template has no {{placeholders}}, so it would ignore the movie data." };

  const client = await db().connect();
  let savedId = templateId;
  try {
    await client.query("BEGIN");
    let scope = { kind, language };
    if (templateId) {
      const { rows } = await client.query<{ kind: ContentKind; language: Language }>(
        "SELECT kind, language FROM studio_templates WHERE id = $1 FOR UPDATE",
        [templateId],
      );
      if (!rows[0]) throw new Error("Template not found");
      scope = rows[0];
    }
    if (isDefault) {
      await client.query(
        "UPDATE studio_templates SET is_default = false WHERE kind = $1 AND language = $2 AND id IS DISTINCT FROM $3",
        [scope.kind, scope.language, templateId],
      );
    }
    if (templateId) {
      // Kind and language are fixed once created. A default stays default until another
      // template is made default, so every kind/language pair always keeps one.
      await client.query(
        `UPDATE studio_templates SET name = $2, body = $3, is_default = is_default OR $4, updated_at = now()
          WHERE id = $1`,
        [templateId, name, body, isDefault],
      );
    } else {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO studio_templates (kind, language, name, body, is_default, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [kind, language, name, body, isDefault, user.id],
      );
      savedId = rows[0].id;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await audit(user.id, templateId ? "template.update" : "template.create", { type: "template", id: savedId! }, { name, kind, language, isDefault });
  revalidatePath("/studio/templates");
  if (!templateId) redirect(`/studio/templates/${savedId}`);
  return { ok: "Template saved" };
}

export async function deleteTemplate(form: FormData) {
  const user = await requireEditor();
  const templateId = id(form);
  // Keep at least one template per content type and language
  const { rows } = await query<{ name: string }>(
    `DELETE FROM studio_templates t
      WHERE t.id = $1
        AND (SELECT count(*) FROM studio_templates o WHERE o.kind = t.kind AND o.language = t.language) > 1
      RETURNING t.name`,
    [templateId],
  );
  if (rows[0]) await audit(user.id, "template.delete", { type: "template", id: templateId }, { name: rows[0].name });
  revalidatePath("/studio/templates");
  redirect("/studio/templates");
}

// ---------- Facts ----------

export async function createFact(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireEditor();
  const movieId = Number(form.get("movieId"));
  const language = langOf(form);
  const text = str(form, "text");
  const sourceUrl = str(form, "sourceUrl");
  const sourceTitle = str(form, "sourceTitle") || null;
  if (!Number.isSafeInteger(movieId) || movieId <= 0) return { error: "Pick a movie." };
  if (text.length < 10) return { error: "Write the fact (at least 10 characters)." };
  if (text.length > 600) return { error: "Keep facts under 600 characters." };
  try {
    const u = new URL(sourceUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return { error: "Every fact needs a source link (http:// or https://)." };
  }
  const { rowCount } = await query(
    `INSERT INTO studio_facts (movie_id, language, text, source_url, source_title, created_by)
     SELECT id, $2, $3, $4, $5, $6 FROM movies WHERE id = $1`,
    [movieId, language, text, sourceUrl, sourceTitle, user.id],
  );
  if (!rowCount) return { error: "That movie no longer exists." };
  await audit(user.id, "fact.create", { type: "movie", id: movieId }, { language, source: sourceUrl });
  revalidatePath("/studio/facts");
  return { ok: "Fact added as unverified. Check the source, then mark it verified." };
}

export async function reviewFact(form: FormData) {
  const user = await requireEditor();
  const status = str(form, "status");
  if (!["verified", "rejected", "unverified"].includes(status)) throw new Error("Invalid status");
  await query(
    `UPDATE studio_facts SET status = $2, review_note = NULLIF($3, ''),
            reviewed_by = CASE WHEN $2 = 'unverified' THEN NULL ELSE $4::bigint END,
            reviewed_at = CASE WHEN $2 = 'unverified' THEN NULL ELSE now() END
      WHERE id = $1`,
    [id(form), status, str(form, "note").slice(0, 300), user.id],
  );
  await audit(user.id, `fact.${status === "verified" ? "verify" : status === "rejected" ? "reject" : "reset"}`, { type: "fact", id: id(form) });
  revalidatePath("/studio/facts");
}

export async function deleteFact(form: FormData) {
  const user = await requireEditor();
  const { rowCount } = await query("DELETE FROM studio_facts WHERE id = $1", [id(form)]);
  if (rowCount) await audit(user.id, "fact.delete", { type: "fact", id: id(form) });
  revalidatePath("/studio/facts");
}

// ---------- Brand settings ----------

export async function saveBrandSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireEditor();
  const brandName = str(form, "brandName");
  const signature = (typeof form.get("signature") === "string" ? (form.get("signature") as string) : "").replace(/\r\n/g, "\n").trim();
  const hashtags = str(form, "hashtags");
  const siteUrl = str(form, "siteUrl").replace(/\/+$/, "");
  if (!brandName) return { error: "Brand name can't be empty." };
  if (signature.length > 500 || hashtags.length > 300) return { error: "Signature or hashtags are too long." };
  if (siteUrl) {
    try {
      const u = new URL(siteUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
      return { error: "Site URL must start with http:// or https://." };
    }
  }
  const on = (k: string) => form.get(k) === "on";
  await query(
    `UPDATE brand_settings SET brand_name = $1, signature = $2, hashtags = $3, site_url = $4,
            include_rating = $5, include_runtime = $6, include_genres = $7, include_director = $8,
            include_trailer = $9, updated_by = $10, updated_at = now()
      WHERE id = 1`,
    [brandName, signature, hashtags, siteUrl, on("includeRating"), on("includeRuntime"), on("includeGenres"),
     on("includeDirector"), on("includeTrailer"), user.id],
  );
  await audit(user.id, "brand.update", { type: "brand", id: 1 }, { brandName, siteUrl });
  revalidatePath("/studio", "layout");
  return { ok: "Brand settings saved. Regenerate drafts to apply them." };
}
