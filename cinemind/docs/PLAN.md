# CineMind AI — implementation plan

Updated: 2026-10-27

## Scope of the current version

CineMind AI is a standalone movie platform. Priorities:

1. **Movie platform:** home page, real movie search, genre filters, detail pages, trailers, similar movies.
2. **Smart recommendations:** based on mood, genre and user preferences.
3. **CineMind Content Studio:** in-app content creation (movie cards, descriptions, weekly collections, facts).
4. **Database and admin panel:** PostgreSQL, Uzbek titles, personal watchlists, templates, admin settings.

The interface is in English. Uzbek-language editorial content (titles, synopses and later Content Studio drafts) is a first-class part of the data model.

### Explicitly out of scope

**Telegram integration is not part of the current version.** There is no Bot API integration, bot credentials, channel permissions, automated publishing, Telegram webhooks or Telegram-specific backend code. No Telegram services, database tables, environment variables or dependencies will be created until they are actually needed.

Content Studio never publishes to any external platform automatically. Content is edited, saved and copied inside the app.

## Architecture

- **Next.js 16 (App Router) + TypeScript:** server components and server actions; no separate API server.
- **PostgreSQL** (`pg` driver): schema lives in `db/migrations/*.sql` and is applied with `npm run db:migrate`. No ORM; queries live in repository modules.
- **Authentication:** email and password (bcrypt). Sessions are stored in the database (only the token's SHA-256 hash) with an httpOnly cookie in the browser.
- **Movie data:** the local catalogue is the primary source. With `TMDB_API_KEY` set, search imports new movies from TMDB and detail pages are enriched with poster, rating, runtime, director and trailer. If TMDB is unavailable, the site keeps working from the local catalogue.

Modules are split by domain and only talk to each other through exported functions:

```
src/lib/
  db.ts              connection pool
  auth/              sessions, sign in / sign up
  movies/            catalogue repository, TMDB client, sync
  watchlist/         personal watchlists
  recommend/         recommendation engine, moods, candidate loading
  ratings/           user ratings
  preferences/       favourite genres, onboarding
  studio/            Content Studio: templates, renderer, formatters, drafts, facts, brand
```

### Extension point for future integrations

A Content Studio result is a platform-neutral `ContentDraft` record: title, body, movie references and brand signature. Turning it into text is the job of **formatters** (plain text, Markdown, HTML).

If publishing to a platform (e.g. Telegram) is ever needed, a new `src/lib/integrations/<platform>/` module will be added. It reads finished drafts and sends them through its own formatter. The core movie app, the catalogue and the studio schema stay unchanged; only the new module, its settings and, if needed, a separate migration are added. **No code is written for it now.**

## Stages

### Stage 1: foundation ✅
- [x] Project structure, PostgreSQL via Docker, migrations and seed (19 genres, 30 films with English synopses and Uzbek titles/synopses)
- [x] Sign up, sign in, sign out, protected pages, safe `next` redirects
- [x] Search across English, original and Uzbek titles; typo-tolerant (`pg_trgm`); genre filter; sorting; pagination
- [x] Optional TMDB integration: import from search, detail sync, release-year sanity check
- [x] Home page (featured movie, genres, themed rows)
- [x] Detail page: trailer (YouTube embed or search link), director, runtime, genres, Uzbek title and synopsis, similar movies
- [x] Watchlist: add, remove, mark as watched
- [x] Responsive dark UI (phone, tablet, desktop)
- [x] English interface

### Stage 2: deeper discovery
- Filters for year range, language and rating
- Cast and crew (TMDB credits), person pages
- Admin import of TMDB trending and popular movies
- Admin editing of Uzbek titles and synopses
- Image optimisation (`next/image`, TMDB sizes)

### Stage 3: recommendation system ✅
- [x] Onboarding after sign-up: pick favourite genres and liked movies (liked picks are saved as 8/10 and the UI says so); editable later
- [x] `user_ratings` table and a 1–10 rating widget on movie pages
- [x] Content-based engine (`src/lib/recommend/engine.ts`, pure and unit tested): the taste profile combines favourite genres, ratings (signed: 10 → +1, 1 → −1) and watchlist; candidates are scored on genre match, director affinity, era, rating quality (vote-count weighted) and popularity percentile, then re-ranked so one director doesn't dominate
- [x] Mood-based recommendations (9 moods → genre weights, plus a runtime limit for "Short on time"); work signed out too, and blend with your taste when signed in
- [x] "Why this was recommended" notes on every pick (director you rated, genres you like, mood fit, high rating)
- [x] "For you" page and a "Recommended for you" row on the home page
- [x] Cold start: popular and well-rated picks with a prompt to set your taste

Scaling note: the engine scores the 3,000 most popular movies in memory per request, which is fast at the current catalogue size. A much larger catalogue would pre-filter candidates by genre in SQL and cache profiles.

### Stage 4: CineMind Content Studio ✅
- [x] Migration 003: `brand_settings` (single row), `studio_templates`, `studio_drafts`, `studio_facts` (source URL required, verification status unverified / verified / rejected)
- [x] Editors only (`users.role = 'admin'`); everyone else gets a 404 at `/studio`
- [x] Four content types: movie card, movie description, weekly collection, interesting facts — each with default Uzbek and English templates
- [x] Template engine (`src/lib/studio/render.ts`, pure and unit tested): `{{value}}`, `{{#block}}…{{/block}}` (shown when present, repeated for lists), `{{^block}}`; `**bold**` and `_italic_` markup
- [x] Uzbek-language editorial content: Uzbek titles, synopses, genre names, runtime ("2 soat 49 daqiqa") and week ranges ("26-oktabr – 1-noyabr"); warnings when Uzbek data is missing
- [x] Draft editor: edit, live preview, save, status (draft / ready / archived), duplicate, delete, regenerate from any template, unsaved-changes guard
- [x] Copy as plain text, Markdown, or formatted (HTML with bold, italics and links, plus plain fallback)
- [x] Weekly collections: pick up to 15 movies, or auto-pick 7 with the recommendation engine, optionally by mood
- [x] Facts library: add facts with a source link, review (verify / reject / reset with a note); only verified facts in the post's language are used
- [x] Template manager: create (starting from the default), edit with live sample preview, set default, delete (one per type/language always remains); block-balance validation
- [x] Brand settings: brand name, signature, hashtags, site URL for movie links, and toggles for rating, runtime, genres, director and trailer
- [x] Optional "Write synopsis with AI" (Claude API via `@anthropic-ai/sdk`, model `claude-opus-5-5`, server-side refusal fallback enabled) for movie cards and descriptions — only when `ANTHROPIC_API_KEY` is set; uses only the movie's data, replaces only the synopsis, and the editor reviews it before use. Facts are never AI-generated
- [x] No automatic publishing to any external platform

### Stage 5: admin panel
- Admin area (role check on `users.role`)
- Brand signature and formatting settings, template management
- User list, manual movie creation and editing
- Security: sign-in rate limiting, audit log

## Known limitations (stage 1)
- Seed movies have no rating, poster or trailer; those come only from TMDB (no made-up numbers). A colour gradient stands in for the poster.
- For seed movies only the release year is known (stored as `YYYY-01-01`; the UI shows the year only).
- Sign-in attempts are not rate limited yet (stage 5).
