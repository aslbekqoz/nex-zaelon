# 🎬 CineMind AI

A professional movie platform: search, genre filters, movie detail pages with trailers, similar movies, a personal watchlist, ratings and smart recommendations (personal and mood-based) with an explanation for every pick — plus the in-app **CineMind Content Studio** for editors: movie cards, descriptions, weekly collections and source-backed facts in Uzbek and English, with templates, brand settings and copy-ready output. Nothing is ever published automatically.

Stages and architecture: [`docs/PLAN.md`](docs/PLAN.md).

> This folder is fully independent of the YouTube agent system in the rest of the repository. It has its own `package.json` and does not touch any code outside it.

## Getting started

Requirements: Node.js 22.9+ and PostgreSQL 14+ (easiest via Docker).

```bash
cd cinemind
cp .env.example .env
docker compose up -d        # starts PostgreSQL 16
npm install
npm run db:setup            # creates tables and loads the starter catalogue
npm run dev                 # http://localhost:3000
```

If you already run PostgreSQL, change `DATABASE_URL` in `.env`.

### Real movie data (TMDB)

Without a key the platform runs on the starter catalogue: 30 well-known films with English synopses plus Uzbek titles and synopses. For real posters, ratings, trailers and searching any movie:

1. Create a free account at https://www.themoviedb.org
2. Get a key under **Settings → API** (a v3 API key or a v4 Read Access Token both work)
3. Put it on the `TMDB_API_KEY=` line in `.env` and restart the server

Search then imports matching movies from TMDB into the catalogue. The first time a movie page is opened, its poster, rating, runtime, director and trailer are filled in. Uzbek titles and synopses are never overwritten.

### Admin and Content Studio

Sign up on the site, then give your account editor (admin) rights:

```bash
npm run admin:create -- you@example.com
```

A **Studio** link then appears in the header (`/studio`). Create drafts from templates, edit and preview them, and copy the result as plain text, Markdown or formatted text to post wherever you like. Facts need a source link and must be marked verified before they appear in posts.

Optional: set `ANTHROPIC_API_KEY` in `.env` to enable **Write synopsis with AI** for movie cards and descriptions.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (recommendation engine, Content Studio) |
| `npm run db:migrate` | Apply new migrations |
| `npm run db:seed` | Load genres and starter movies (safe to re-run) |

## Structure

```
db/migrations/        SQL migrations
scripts/              migrate, seed, admin tools
src/app/              pages (home, search, movie, for you, onboarding, sign in/up, watchlist, studio)
src/components/       UI components
src/lib/auth/         sessions and authentication
src/lib/movies/       catalogue, TMDB client, sync
src/lib/watchlist/    personal watchlists
src/lib/recommend/    recommendation engine and moods
src/lib/ratings/      user ratings
src/lib/preferences/  favourite genres and onboarding
src/lib/studio/       Content Studio: templates, renderer, formatters, drafts, facts
```
