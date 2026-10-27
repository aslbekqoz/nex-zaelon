-- CineMind AI: stage 4 schema (Content Studio: brand settings, templates, drafts, facts).
-- Nothing here publishes anywhere: drafts are edited, saved and copied inside the app.

-- Single-row table holding the brand signature and post formatting options
CREATE TABLE brand_settings (
  id               SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name       TEXT NOT NULL DEFAULT 'CineMind AI',
  signature        TEXT NOT NULL DEFAULT '🎬 CineMind AI',
  hashtags         TEXT NOT NULL DEFAULT '#CineMind #kino',
  site_url         TEXT NOT NULL DEFAULT '',
  include_rating   BOOLEAN NOT NULL DEFAULT true,
  include_runtime  BOOLEAN NOT NULL DEFAULT true,
  include_genres   BOOLEAN NOT NULL DEFAULT true,
  include_director BOOLEAN NOT NULL DEFAULT true,
  include_trailer  BOOLEAN NOT NULL DEFAULT true,
  updated_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO brand_settings (id) VALUES (1);

CREATE TABLE studio_templates (
  id         BIGSERIAL PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('movie_card', 'description', 'weekly', 'facts')),
  language   TEXT NOT NULL CHECK (language IN ('uz', 'en')),
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- At most one default template per kind and language
CREATE UNIQUE INDEX studio_templates_default_idx ON studio_templates (kind, language) WHERE is_default;

CREATE TABLE studio_drafts (
  id          BIGSERIAL PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('movie_card', 'description', 'weekly', 'facts')),
  language    TEXT NOT NULL CHECK (language IN ('uz', 'en')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  movie_ids   BIGINT[] NOT NULL DEFAULT '{}',
  template_id BIGINT REFERENCES studio_templates(id) ON DELETE SET NULL,
  -- 'ready' means approved for manual use; it is never sent anywhere automatically
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX studio_drafts_updated_idx ON studio_drafts (updated_at DESC);

-- Every fact needs a source; only verified facts are used in generated posts
CREATE TABLE studio_facts (
  id           BIGSERIAL PRIMARY KEY,
  movie_id     BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  language     TEXT NOT NULL CHECK (language IN ('uz', 'en')),
  text         TEXT NOT NULL,
  source_url   TEXT NOT NULL CHECK (source_url ~* '^https?://'),
  source_title TEXT,
  status       TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified', 'rejected')),
  review_note  TEXT,
  created_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX studio_facts_movie_idx ON studio_facts (movie_id, status);

-- Default templates. Syntax: {{name}} inserts a value; {{#name}}…{{/name}} shows a block only
-- when the value is present (or repeats it for each item in a list); **bold** and _italic_.
INSERT INTO studio_templates (kind, language, name, is_default, body) VALUES
('movie_card', 'uz', 'Film kartasi', true,
'🎬 **{{title}}**{{#year}} ({{year}}){{/year}}
{{#original_title}}_{{original_title}}_
{{/original_title}}
{{#rating}}⭐ Reyting: {{rating}}/10
{{/rating}}{{#genres}}🎭 Janr: {{genres}}
{{/genres}}{{#runtime}}⏱ Davomiyligi: {{runtime}}
{{/runtime}}{{#director}}🎥 Rejissyor: {{director}}
{{/director}}
{{overview}}
{{#trailer_url}}
▶️ Treyler: {{trailer_url}}
{{/trailer_url}}{{#url}}
🔗 {{url}}
{{/url}}
{{signature}}
{{hashtags}}'),
('movie_card', 'en', 'Movie card', true,
'🎬 **{{title}}**{{#year}} ({{year}}){{/year}}
{{#original_title}}_{{original_title}}_
{{/original_title}}
{{#rating}}⭐ Rating: {{rating}}/10
{{/rating}}{{#genres}}🎭 Genre: {{genres}}
{{/genres}}{{#runtime}}⏱ Runtime: {{runtime}}
{{/runtime}}{{#director}}🎥 Director: {{director}}
{{/director}}
{{overview}}
{{#trailer_url}}
▶️ Trailer: {{trailer_url}}
{{/trailer_url}}{{#url}}
🔗 {{url}}
{{/url}}
{{signature}}
{{hashtags}}'),
('description', 'uz', 'Film tavsifi', true,
'**{{title}}**{{#year}} ({{year}}){{/year}}

{{overview}}

{{#director}}Rejissyor: {{director}}. {{/director}}{{#genres}}Janr: {{genres}}.{{/genres}}

{{signature}}'),
('description', 'en', 'Movie description', true,
'**{{title}}**{{#year}} ({{year}}){{/year}}

{{overview}}

{{#director}}Directed by {{director}}. {{/director}}{{#genres}}Genre: {{genres}}.{{/genres}}

{{signature}}'),
('weekly', 'uz', 'Haftalik ro''yxat', true,
'🍿 **Haftaning kinolari**
{{week_range}}

{{#movies}}{{index}}. **{{title}}**{{#year}} ({{year}}){{/year}}{{#genres}} — {{genres}}{{/genres}}
{{#tagline}}{{tagline}}
{{/tagline}}
{{/movies}}
{{signature}}
{{hashtags}}'),
('weekly', 'en', 'Weekly collection', true,
'🍿 **Movies of the week**
{{week_range}}

{{#movies}}{{index}}. **{{title}}**{{#year}} ({{year}}){{/year}}{{#genres}} — {{genres}}{{/genres}}
{{#tagline}}{{tagline}}
{{/tagline}}
{{/movies}}
{{signature}}
{{hashtags}}'),
('facts', 'uz', 'Qiziqarli faktlar', true,
'💡 **«{{title}}» haqida qiziqarli faktlar**

{{#facts}}{{index}}. {{text}}
Manba: {{source}}

{{/facts}}
{{signature}}
{{hashtags}}'),
('facts', 'en', 'Interesting facts', true,
'💡 **Interesting facts about {{title}}**

{{#facts}}{{index}}. {{text}}
Source: {{source}}

{{/facts}}
{{signature}}
{{hashtags}}');
