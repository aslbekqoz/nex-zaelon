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
  people/            person pages and filmographies
  recommend/         recommendation engine, moods, candidate loading
  ratings/           user ratings
  preferences/       favourite genres, onboarding
  studio/            Content Studio: templates, renderer, formatters, drafts, facts, brand
  admin/             admin panel: users, manual movie editing, dashboard stats
  audit.ts           audit log
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

### Stage 2: deeper discovery ✅
- [x] Migration 005: `people`, `movie_credits` (cast with character and billing order; key crew by job), indexes for the new filters
- [x] Search filters: year range, original language (with counts) and minimum rating, combined with text search, genre and sorting; links and pagination keep every filter
- [x] Cast and crew from TMDB credits: up to 15 billed cast and key crew (director, writers, composer, cinematographer, editor, up to 3 producers); cast row and linked crew on movie pages
- [x] Person pages (`/people/[id]`): photo, known for, birth/death with age, biography, and filmography split into acting and behind the camera; their 24 best-known released films are added to the catalogue from TMDB
- [x] Admin import of TMDB lists (trending, popular, top rated, now in cinemas; up to 100 movies), audited
- [x] Admin editing of Uzbek titles and synopses (done in stage 5)
- [x] Images: right TMDB size per place with responsive `srcset` (cards ~w342, detail poster w500/w780, backdrops w780/w1280, profiles w185), lazy loading, and a clean fallback instead of a broken image when a picture fails (also before hydration)

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

### Stage 5: admin panel ✅
- [x] Migration 004: `users.disabled_at`, `movies.sync_locked`, `auth_attempts`, `audit_log`
- [x] Admin area at `/admin` (role check on `users.role`; everyone else gets a 404), linked from the header for admins
- [x] Overview: users, movies, ratings, drafts, items needing attention (facts awaiting review, failed sign-ins, disabled accounts), integration status, recent activity
- [x] Users: search and filter; make/remove admin; disable/enable (disabling signs the user out everywhere); sign out everywhere. You can't change your own role or disable yourself, and at least one active admin always remains (enforced under a database lock)
- [x] Movies: search, add by hand, edit every field (English and Uzbek titles/synopses, director, date, runtime, language, poster, backdrop, trailer from any YouTube link, genres), delete. Editing a TMDB movie locks it against TMDB refreshes unless unticked
- [x] Brand signature, formatting settings and templates managed in the Content Studio, linked from the admin menu
- [x] Security: per-email sign-in limit (5 failures / 15 min, reset by a successful sign-in), per-IP sign-in (20 / 15 min) and sign-up (5 / hour) limits when `TRUST_PROXY_HEADERS=1`; constant-time sign-in for unknown emails; "account disabled" shown only after a correct password
- [x] Audit log of admin and studio actions (users, movies, drafts, templates, facts, brand, CLI promotions) with filters and paging
- [x] Forms keep what you typed when the server reports a validation error

### Follow-up: password reset ✅
- [x] Migration 006: `password_resets` (token hash, expiry, one-time use, created by email or admin); `auth_attempts` gains the `reset` kind
- [x] "Forgot your password?" → one-time link by email, valid 60 minutes; same reply whether or not the account exists, email sent after the response so timing doesn't reveal it either
- [x] Reset page: new password + confirmation; signs out every other session, clears sign-in lockout, signs the user in; token kept out of Referer headers and search engines
- [x] A new request invalidates older links; used, replaced, expired and malformed links are rejected
- [x] Admins can create a one-time reset link (valid 24 hours) from Admin → Users to send by hand
- [x] Email over SMTP (`SMTP_URL`, `MAIL_FROM`); links built from `APP_URL`, never from the Host header; development prints emails to the console
- [x] Rate limits: 3 requests per email per hour, 10 per IP behind a trusted proxy; every step in the audit log

### Follow-up: email confirmation ✅
- [x] Migration 007: `users.email_verified_at`, `email_verifications` (hashed one-time tokens tied to the address they were sent to); `auth_attempts` gains the `verify` kind
- [x] Confirmation email on sign-up (link valid 48 hours); banner with **Resend email** (3 per hour) until confirmed
- [x] `/verify-email` works without signing in; reopening a used link says it's already confirmed; replaced, expired, malformed and changed-address links are rejected
- [x] Completing a password reset confirms the address
- [x] Admin: "Email unverified" badge and filter, **Mark email verified**, count on the overview; every step in the audit log
- [x] ~~Soft by design~~ — made mandatory in the next follow-up

### Follow-up: mandatory email confirmation ✅
- [x] `EMAIL_VERIFICATION=required` (default): unconfirmed users can't use account features — watchlist, ratings, onboarding, Studio and Admin pages redirect to **Check your inbox**, and the matching actions are refused; the public catalogue stays open
- [x] Sign-up goes to **Check your inbox**, then continues to onboarding once confirmed
- [x] Studio and Admin check the role first, so non-editors still get a 404
- [x] Migration 008 marks pre-existing accounts as confirmed so nobody is locked out
- [x] Recovery without email: Admin → Users → Mark email verified, `npm run user:verify`, and `npm run admin:create` confirms the admin; production without SMTP shows "ask the administrator"
- [x] `EMAIL_VERIFICATION=optional` restores the reminder-only behaviour

### Follow-up: changing the account email ✅
- [x] Migration 009: `email_changes` (old and new address, hashed one-time token, expiry, used/cancelled); `auth_attempts` gains `email_change`
- [x] **Account** page (`/account`, linked from the user's name in the header, also on phones): name, email with confirmation status, change form, pending change with **Cancel**
- [x] New address + current password; wrong passwords share the sign-in lockout; same, invalid and taken addresses rejected; 3 requests per hour
- [x] The address changes only after the link sent to the new address is opened (24 hours); a newer request or cancel retires older links; reopening a used link says it's done
- [x] In one transaction: switch the address (counts as confirmed), retire other pending changes, invalidate reset and confirmation links sent to the old address; a race with another account taking the address is rejected
- [x] Security notices to the old address when a change is requested and when it completes (new address masked, with a password reset link)
- [x] Unconfirmed users can open the Account page to fix a mistyped address ("Wrong address? Change it" on **Check your inbox**)

### Follow-up: changing the password ✅
- [x] **Change password** on the Account page: current password, new password twice; same rules as sign-up and must differ from the current one
- [x] Wrong current passwords share the sign-in lockout
- [x] On success: every session is signed out and this device gets a fresh session; unused reset links stop working; a "your password was changed" email with a reset link; audit entry

### Follow-up: changing the display name ✅
- [x] **Change name** on the Account page; shared rules with sign-up: 2–60 characters, whitespace tidied, invisible/control characters (incl. bidi overrides) rejected
- [x] The header updates immediately; the change is recorded in the audit log with the old and new name

## Known limitations
- Seed movies have no rating, poster or trailer; those come only from TMDB (no made-up numbers). A colour gradient stands in for the poster.
- For seed movies only the release year is known (stored as `YYYY-01-01`; the UI shows the year only).
- An address taken by someone else's unconfirmed account can be reclaimed by its owner through "Forgot password".
- Roles are `user` and `admin`; every admin can use the Content Studio. A separate `editor` role can be added later without schema changes beyond the role check.
