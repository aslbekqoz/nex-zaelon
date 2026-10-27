# 🎬 CineMind AI

A professional movie platform: search with genre, year, language and rating filters, movie detail pages with trailers, cast and crew, person pages, similar movies, a personal watchlist, ratings and smart recommendations (personal and mood-based) with an explanation for every pick — plus the in-app **CineMind Content Studio** for editors: movie cards, descriptions, weekly collections and source-backed facts in Uzbek and English, with templates, brand settings and copy-ready output. Nothing is ever published automatically.

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

Search then imports matching movies from TMDB into the catalogue. The first time a movie page is opened, its poster, rating, runtime, trailer, cast and crew are filled in; opening a person's page adds their best-known films. Admins can also import TMDB's trending, popular, top-rated and now-playing lists from **Admin → Movies**. Uzbek titles and synopses are never overwritten, and movies an admin edited by hand are not refreshed.

### Admin and Content Studio

Sign up on the site, then give your account editor (admin) rights:

```bash
npm run admin:create -- you@example.com
```

A **Studio** link then appears in the header (`/studio`). Create drafts from templates, edit and preview them, and copy the result as plain text, Markdown or formatted text to post wherever you like. Facts need a source link and must be marked verified before they appear in posts.

Optional: set `ANTHROPIC_API_KEY` in `.env` to enable **Write synopsis with AI** for movie cards and descriptions.

The **Admin** link (`/admin`) opens the admin panel: an overview, user management (admin rights, disabling accounts, signing users out), adding and editing movies by hand (including Uzbek titles and synopses), and the audit log of admin and studio actions.

### Email: confirmation and password reset

New accounts get an email with a link to confirm their address (valid 48 hours). Until they confirm, a banner reminds them and offers **Resend email**; the link works on any device without signing in. Confirmation is a reminder, not a gate — unconfirmed users can still use the site. Completing a password reset also confirms the address, and admins can mark an address as confirmed in **Admin → Users**.

"Forgot your password?" on the sign-in page emails a one-time link that expires in 60 minutes. Using it sets a new password, signs the account out everywhere else and signs it in. To send real emails, set in `.env`:

- `APP_URL` — the site's public address (e.g. `https://cinemind.uz`); required in production because reset links are built from it, never from the request's Host header
- `SMTP_URL` — e.g. `smtps://user:password@smtp.example.com:465`
- `MAIL_FROM` — the sender, e.g. `CineMind AI <no-reply@cinemind.uz>`

Without `SMTP_URL`, development prints emails to the server console; production sends nothing and logs an error. Admins can also create a one-time reset link (valid 24 hours) from **Admin → Users** to send by hand.

### Security notes

- Sign-in is limited to 5 failed attempts per email every 15 minutes.
- Behind a reverse proxy that sets `X-Forwarded-For` (nginx, Vercel, Cloudflare…), set `TRUST_PROXY_HEADERS=1` to also limit sign-ins and sign-ups per IP. Leave it unset otherwise, since those headers can be forged.
- Disabled accounts are signed out everywhere and can't sign in.
- Confirmation emails can be re-sent 3 times per hour; a link only confirms the address it was sent to.
- Password reset requests are limited to 3 per email per hour; the reply is the same whether or not an account exists, and only a hash of each reset token is stored.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (recommendations, Content Studio, rate limiting, password reset, email confirmation, movie form, credits, filters, images) |
| `npm run db:migrate` | Apply new migrations |
| `npm run db:seed` | Load genres and starter movies (safe to re-run) |

## Structure

```
db/migrations/        SQL migrations
scripts/              migrate, seed, admin tools
src/app/              pages (home, search, movie, person, for you, onboarding, sign in/up, password reset, email confirmation, watchlist, studio, admin)
src/components/       UI components
src/lib/auth/         sessions, authentication, rate limits, password reset, email confirmation
src/lib/email/        outgoing email (SMTP) and templates
src/lib/movies/       catalogue, TMDB client, sync, credits, filters, image sizes
src/lib/people/       person pages and filmographies
src/lib/watchlist/    personal watchlists
src/lib/recommend/    recommendation engine and moods
src/lib/ratings/      user ratings
src/lib/preferences/  favourite genres and onboarding
src/lib/studio/       Content Studio: templates, renderer, formatters, drafts, facts
src/lib/admin/        admin panel: users, movie editing, dashboard
src/lib/audit.ts      audit log
```
