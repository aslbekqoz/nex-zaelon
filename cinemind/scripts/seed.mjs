// Janrlar va boshlang'ich filmlarni bazaga yozadi. Qayta ishga tushirish xavfsiz:
// TMDB'dan olingan ma'lumotlar ustidan yozilmaydi.
import pg from "pg";
import { genres, movies } from "./seed-data.mjs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL topilmadi.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  for (const [id, slug, nameUz, nameEn] of genres) {
    await client.query(
      `INSERT INTO genres (id, slug, name_uz, name_en) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name_uz = EXCLUDED.name_uz, name_en = EXCLUDED.name_en`,
      [id, slug, nameUz, nameEn],
    );
  }

  movies.forEach((m, i) => (m.popularity = movies.length - i));
  for (const m of movies) {
    const { rows } = await client.query(
      `INSERT INTO movies (tmdb_id, title, title_uz, original_title, overview_uz, director,
                           release_date, runtime, original_language, popularity, source)
       VALUES ($1, $2, $3, $4, $5, $6, make_date($7, 1, 1), $8, $9, $10, 'seed')
       ON CONFLICT (tmdb_id) DO UPDATE SET
         title_uz    = EXCLUDED.title_uz,
         overview_uz = EXCLUDED.overview_uz,
         director    = COALESCE(movies.director, EXCLUDED.director),
         updated_at  = now()
       RETURNING id`,
      [m.tmdb_id, m.title, m.title_uz, m.original_title ?? m.title, m.overview_uz, m.director,
       m.year, m.runtime, m.lang, m.popularity],
    );
    const movieId = rows[0].id;
    for (const g of m.genres) {
      await client.query(
        "INSERT INTO movie_genres (movie_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [movieId, g],
      );
    }
  }
  await client.query("COMMIT");
  console.log(`✓ ${genres.length} ta janr, ${movies.length} ta film yozildi.`);
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  await client.end();
}
