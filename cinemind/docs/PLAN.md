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
  (later) recommend/ recommendation algorithms
  (later) studio/    Content Studio: templates, drafts, formatters
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

### Stage 3: recommendation system
- Onboarding: pick favourite genres and movies
- `user_ratings` table: rate movies 1–10
- Content-based scoring: genre vector, director, year, rating, popularity; watchlist and ratings update the user profile
- Mood-based recommendations: map moods to genre and feature weights ("I want to laugh" → comedy, animation…)
- "Why this was recommended" explanations and a personal row on the home page

### Stage 4: CineMind Content Studio
- Tables: `studio_templates`, `studio_drafts`, `studio_facts` (source URL, verification status: unverified / verified / rejected), `brand_settings`
- Generators: movie card, movie description, weekly movie collection, interesting facts with source references
- Uzbek-language editorial content
- Editing, preview, saving drafts, copying formatted text, reusable templates
- Optional AI-assisted writing (Claude API); the key is only added in this stage. Facts are never shown as verified without a source
- No automatic publishing to external platforms

### Stage 5: admin panel
- Admin area (role check on `users.role`)
- Brand signature and formatting settings, template management
- User list, manual movie creation and editing
- Security: sign-in rate limiting, audit log

## Known limitations (stage 1)
- Seed movies have no rating, poster or trailer; those come only from TMDB (no made-up numbers). A colour gradient stands in for the poster.
- For seed movies only the release year is known (stored as `YYYY-01-01`; the UI shows the year only).
- Sign-in attempts are not rate limited yet (stage 5).
