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

### Search suggestions

Typing two or more letters in the header search shows matching movies (by English, Uzbek or original title) and people from the catalogue. Use the arrow keys and Enter, or click. Enter with nothing highlighted, or **See all results**, opens the full search page.

### Watchlist

**My watchlist** filters by All, To watch or Watched, sorts by date added, title, year, TMDB rating or your own rating, and shows your rating next to each movie. **Export CSV** downloads the list for Excel or Google Sheets.

### Admin and Content Studio

Sign up on the site, then give your account admin rights:

```bash
npm run admin:create -- you@example.com
```

A **Studio** link then appears in the header (`/studio`). Create drafts from templates, edit and preview them, and copy the result as plain text, Markdown or formatted text to post wherever you like. Facts need a source link and must be marked verified before they appear in posts.

Optional: set `ANTHROPIC_API_KEY` in `.env` to enable **Write synopsis with AI** for movie cards and descriptions.

Roles: **users** browse, rate and save movies; **editors** also use the Content Studio; **admins** use the Studio and the admin panel. Admins change roles under **Admin → Users**, or on the server with `npm run user:role -- email editor` (`user`, `editor` or `admin`). There is always at least one active admin.

The **Admin** link (`/admin`) opens the admin panel: an overview, user management (roles, disabling accounts, signing users out), adding and editing movies by hand (including Uzbek titles and synopses), and the audit log of admin and studio actions.

### Email: confirmation and password reset

New accounts must confirm their email address before using account features (watchlist, ratings, onboarding, Studio, Admin). After signing up they see **Check your inbox** with a **Resend email** button; the link (valid 48 hours) works on any device without signing in. The public catalogue — home, search, movie and person pages — stays open. Completing a password reset also confirms the address.

Ways to confirm an account without email: **Admin → Users → Mark email verified**, or on the server `npm run user:verify -- user@example.com` (`npm run admin:create` also confirms the admin's address). Accounts that existed before confirmation became mandatory were marked as confirmed. Set `EMAIL_VERIFICATION=optional` to go back to a reminder banner only.

Users change their email on the **Account** page (click your name in the header): they enter the new address and their current password, and the address changes once they open the link sent to the new one (valid 24 hours). The old address gets a notice when a change is requested and when it's done. Unconfirmed users can use this page to fix a mistyped address.

The Account page also has a **profile picture**: JPEG, PNG, WebP, AVIF or GIF up to 5 MB (after confirming the email). It's cropped to a square, re-encoded and stripped of hidden data such as location, then shown in the header; without one, initials are shown. It also has **Change name** (2–60 characters; extra spaces are tidied and invisible characters rejected) and **Change password** (current password + new one twice). The user stays signed in on that device, every other device is signed out, unused reset links stop working, and a notice is emailed to them.

**Signed-in devices** lists every session with its browser and system, when it signed in and when it was last active. Users can sign out one device or all the others at once.

**Download my data** gives a JSON file with everything stored about the user: account details, favourite genres, watchlist, ratings, profile picture, signed-in sessions and their own account activity. Passwords and sign-in tokens are never included, and Content Studio work isn't part of it.

**Delete account** (at the bottom of the Account page) needs the current password and typing `DELETE`. It permanently removes the account with its watchlist, ratings, preferences, profile picture and sessions, and emails a short confirmation. Content Studio drafts, templates and facts an editor made stay, without their name, and their entries in the activity log show as "Deleted user". The last active admin can't delete their account until someone else is made admin.

"Forgot your password?" on the sign-in page emails a one-time link that expires in 60 minutes. Using it sets a new password, signs the account out everywhere else and signs it in. To send real emails, set in `.env`:

- `APP_URL` — the site's public address (e.g. `https://cinemind.uz`); required in production because reset links are built from it, never from the request's Host header
- `SMTP_URL` — e.g. `smtps://user:password@smtp.example.com:465`
- `MAIL_FROM` — the sender, e.g. `CineMind AI <no-reply@cinemind.uz>`

Without `SMTP_URL`, development prints emails to the server console; production sends nothing and logs an error. Admins can also create a one-time reset link (valid 24 hours) from **Admin → Users** to send by hand.

### Search engines and link previews

With `APP_URL` set, the site serves `/robots.txt` and `/sitemap.xml` (every movie and credited person, read live from the catalogue). Movie and person pages carry canonical links, Open Graph and Twitter preview cards with the poster or photo, and schema.org structured data. Private pages (account, admin, studio, watchlist and sign-in flows) are kept out of search results.

### Security notes

- Sign-in is limited to 5 failed attempts per email every 15 minutes.
- Behind a reverse proxy that sets `X-Forwarded-For` (nginx, Vercel, Cloudflare…), set `TRUST_PROXY_HEADERS=1` to also limit sign-ins and sign-ups per IP. Leave it unset otherwise, since those headers can be forged.
- Disabled accounts are signed out everywhere and can't sign in.
- Confirmation emails can be re-sent 3 times per hour; a link only confirms the address it was sent to.
- Password changes and account deletion need the current password (wrong guesses count toward the sign-in lockout).
- Email changes need the current password (wrong guesses count toward the sign-in lockout), are limited to 3 per hour, and make older reset and confirmation links stop working.
- Profile pictures are always decoded and re-encoded on the server (never stored as uploaded), limited to 10 uploads per hour, and served from unguessable URLs with `nosniff` and a locked-down Content-Security-Policy.
- Password reset requests are limited to 3 per email per hour; the reply is the same whether or not an account exists, and only a hash of each reset token is stored.

## Deployment

`Dockerfile` builds a small production image (Next.js standalone output, runs as a non-root user). On start it applies pending migrations, then serves on port 3000:

```bash
docker build -t cinemind .
docker run -p 3000:3000 --env-file .env cinemind
docker exec <container> node scripts/seed.mjs                 # starter catalogue, once
docker exec <container> node scripts/create-admin.mjs you@example.com
```

Or run the database and the app together: `docker compose --profile app up --build`. Set `APP_URL` (and `SMTP_URL`, `MAIL_FROM`) for production.

`GET /api/health` answers `200 {"status":"ok"}` when the app can reach PostgreSQL and `503` when it can't. The image's Docker health check uses it, and so can a load balancer or uptime monitor. Migrations take a database lock, so several containers can start at once.

Every push and pull request that touches `cinemind/` runs the **CineMind** GitHub Actions workflow. It typechecks, runs the unit tests, applies migrations and the seed twice on a real PostgreSQL, builds, smoke-tests the production server, and builds the Docker image.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (recommendations, Content Studio, rate limiting, password reset, email confirmation and change, profile pictures, account deletion, data export, device names, structured data, roles, watchlist views and CSV, search suggestions, movie form, credits, filters, images) |
| `npm run db:migrate` | Apply new migrations |
| `npm run db:seed` | Load genres and starter movies (safe to re-run) |
| `npm run admin:create -- email` | Give a user admin rights (and confirm their email) |
| `npm run user:role -- email role` | Set a user's role: `user`, `editor` or `admin` |
| `npm run user:verify -- email` | Confirm a user's email address |

## Structure

```
db/migrations/        SQL migrations
scripts/              migrate, seed, admin tools
src/app/              pages (home, search, movie, person, for you, onboarding, sign in/up, account, password reset, email confirmation, watchlist, studio, admin)
src/components/       UI components
src/lib/auth/         sessions, authentication, rate limits, password reset, email confirmation and change
src/lib/avatars/      profile picture processing and storage
src/lib/email/        outgoing email (SMTP) and templates
src/lib/movies/       catalogue, TMDB client, sync, credits, filters, image sizes
src/lib/people/       person pages and filmographies
src/lib/watchlist/    personal watchlists
src/lib/recommend/    recommendation engine and moods
src/lib/ratings/      user ratings
src/lib/preferences/  favourite genres and onboarding
src/lib/studio/       Content Studio: templates, renderer, formatters, drafts, facts
src/lib/account/      "Download my data" export
src/lib/admin/        admin panel: users, movie editing, dashboard
src/lib/seo.ts        structured data for search engines
src/lib/site.ts       the public site address (APP_URL)
src/lib/audit.ts      audit log
```
