import "server-only";
import { query } from "@/lib/db";
import type { BrandSettings, ContentKind, Language } from "./context";

export type Template = {
  id: number;
  kind: ContentKind;
  language: Language;
  name: string;
  body: string;
  isDefault: boolean;
  updatedAt: string;
};

export type DraftStatus = "draft" | "ready" | "archived";

export type Draft = {
  id: number;
  kind: ContentKind;
  language: Language;
  title: string;
  body: string;
  movieIds: number[];
  templateId: number | null;
  status: DraftStatus;
  updatedAt: string;
  updatedByName: string | null;
};

export type FactStatus = "unverified" | "verified" | "rejected";

export type Fact = {
  id: number;
  movieId: number;
  movieTitle: string;
  language: Language;
  text: string;
  sourceUrl: string;
  sourceTitle: string | null;
  status: FactStatus;
  reviewNote: string | null;
  reviewedByName: string | null;
  createdAt: string;
};

export const KINDS: { value: ContentKind; label: string; description: string }[] = [
  { value: "movie_card", label: "Movie card", description: "A post-sized card with rating, genre, runtime and trailer" },
  { value: "description", label: "Movie description", description: "A short editorial synopsis" },
  { value: "weekly", label: "Weekly collection", description: "A numbered list of picks for the week" },
  { value: "facts", label: "Interesting facts", description: "Verified facts with their sources" },
];

export function kindLabel(kind: ContentKind) {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}

// ---------- Brand settings ----------

export async function getBrandSettings(): Promise<BrandSettings> {
  const { rows } = await query<BrandSettings>(
    `SELECT brand_name AS "brandName", signature, hashtags, site_url AS "siteUrl",
            include_rating AS "includeRating", include_runtime AS "includeRuntime",
            include_genres AS "includeGenres", include_director AS "includeDirector",
            include_trailer AS "includeTrailer"
       FROM brand_settings WHERE id = 1`,
  );
  return rows[0];
}

// ---------- Templates ----------

const TEMPLATE_SELECT = `SELECT id, kind, language, name, body, is_default AS "isDefault", updated_at AS "updatedAt" FROM studio_templates`;

export async function listTemplates(filter: { kind?: ContentKind; language?: Language } = {}) {
  const { rows } = await query<Template>(
    `${TEMPLATE_SELECT}
      WHERE ($1::text IS NULL OR kind = $1) AND ($2::text IS NULL OR language = $2)
      ORDER BY kind, language, is_default DESC, name`,
    [filter.kind ?? null, filter.language ?? null],
  );
  return rows;
}

export async function getTemplate(id: number) {
  const { rows } = await query<Template>(`${TEMPLATE_SELECT} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getDefaultTemplate(kind: ContentKind, language: Language) {
  const { rows } = await query<Template>(
    `${TEMPLATE_SELECT} WHERE kind = $1 AND language = $2 ORDER BY is_default DESC, id LIMIT 1`,
    [kind, language],
  );
  return rows[0] ?? null;
}

// ---------- Drafts ----------

const DRAFT_SELECT = `
  SELECT d.id, d.kind, d.language, d.title, d.body, d.movie_ids AS "movieIds", d.template_id AS "templateId",
         d.status, d.updated_at AS "updatedAt", u.name AS "updatedByName"
    FROM studio_drafts d LEFT JOIN users u ON u.id = d.updated_by`;

export async function listDrafts(filter: { kind?: ContentKind; status?: DraftStatus | "active" | "all" } = {}) {
  const status = filter.status ?? "active";
  const { rows } = await query<Draft>(
    `${DRAFT_SELECT}
      WHERE ($1::text IS NULL OR d.kind = $1)
        AND (CASE $2::text WHEN 'all' THEN true WHEN 'active' THEN d.status <> 'archived' ELSE d.status = $2 END)
      ORDER BY d.updated_at DESC
      LIMIT 200`,
    [filter.kind ?? null, status],
  );
  return rows;
}

export async function getDraft(id: number) {
  const { rows } = await query<Draft>(`${DRAFT_SELECT} WHERE d.id = $1`, [id]);
  return rows[0] ?? null;
}

// ---------- Facts ----------

const FACT_SELECT = `
  SELECT f.id, f.movie_id AS "movieId", m.title AS "movieTitle", f.language, f.text, f.source_url AS "sourceUrl",
         f.source_title AS "sourceTitle", f.status, f.review_note AS "reviewNote", r.name AS "reviewedByName",
         f.created_at AS "createdAt"
    FROM studio_facts f
    JOIN movies m ON m.id = f.movie_id
    LEFT JOIN users r ON r.id = f.reviewed_by`;

export async function listFacts(filter: { status?: FactStatus; movieId?: number } = {}) {
  const { rows } = await query<Fact>(
    `${FACT_SELECT}
      WHERE ($1::text IS NULL OR f.status = $1) AND ($2::bigint IS NULL OR f.movie_id = $2)
      ORDER BY f.created_at DESC
      LIMIT 300`,
    [filter.status ?? null, filter.movieId ?? null],
  );
  return rows;
}

export async function verifiedFacts(movieId: number, language: Language) {
  const { rows } = await query<{ text: string; sourceUrl: string; sourceTitle: string | null }>(
    `SELECT text, source_url AS "sourceUrl", source_title AS "sourceTitle"
       FROM studio_facts
      WHERE movie_id = $1 AND language = $2 AND status = 'verified'
      ORDER BY created_at`,
    [movieId, language],
  );
  return rows;
}

export async function factCounts(movieId: number) {
  const { rows } = await query<{ status: FactStatus; language: Language; n: number }>(
    "SELECT status, language, count(*)::int AS n FROM studio_facts WHERE movie_id = $1 GROUP BY status, language",
    [movieId],
  );
  return rows;
}
