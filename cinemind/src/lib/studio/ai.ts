import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Movie } from "@/lib/movies/types";
import type { Language } from "./context";

// Optional AI help for editorial descriptions. Only enabled when ANTHROPIC_API_KEY is set.
// Facts are never AI-generated: they must come from a cited source and be verified by an editor.

const MODEL = "claude-opus-5-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const SYSTEM = `You are an editor for CineMind AI, a movie platform. You write short, engaging editorial
movie descriptions for posts. Rules:
- Use only the facts given in the movie data. Do not invent awards, box office figures, cast or trivia.
- No spoilers beyond the premise.
- 2–4 sentences, 60–110 words.
- Plain text. You may use **bold** for the title once. No hashtags, no emojis, no signature.
- When asked for Uzbek, write natural modern Uzbek in the Latin alphabet (o', g', sh, ch), not a word-for-word translation.`;

function movieData(m: Movie) {
  return JSON.stringify(
    {
      title: m.title,
      uzbek_title: m.titleUz,
      year: m.year,
      director: m.director,
      genres: m.genres.map((g) => g.name),
      runtime_minutes: m.runtime,
      synopsis_en: m.overview,
      synopsis_uz: m.overviewUz,
    },
    null,
    2,
  );
}

export class AiUnavailableError extends Error {}

/** Writes a fresh description for one movie; returns plain text with the tiny studio markup. */
export async function writeDescription(movie: Movie, language: Language, currentDraft: string) {
  if (!aiEnabled()) throw new AiUnavailableError("AI writing is not configured (ANTHROPIC_API_KEY is not set).");
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // Server-side fallback if the request is declined by a safety classifier
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Write a ${language === "uz" ? "Uzbek" : "English"} description for this movie.

<movie>
${movieData(movie)}
</movie>

<current_draft>
${currentDraft}
</current_draft>

Return only the description text.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new AiUnavailableError("The AI declined to write this description. Please write it manually.");
  }
  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
  if (!text) throw new AiUnavailableError("The AI returned an empty description.");
  return text;
}
