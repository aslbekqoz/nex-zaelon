import type { TemplateContext } from "@/lib/studio/render";

/** Sample data for the template editor preview. */
export function sampleContext(language: "uz" | "en"): TemplateContext {
  const uz = language === "uz";
  const movie = {
    title: uz ? "Yulduzlararo" : "Interstellar",
    original_title: uz ? "Interstellar" : "",
    year: 2014,
    rating: "8.4",
    runtime: uz ? "2 soat 49 daqiqa" : "2h 49m",
    genres: uz ? "Sarguzasht, Drama, Ilmiy fantastika" : "Adventure, Drama, Science Fiction",
    director: "Christopher Nolan",
    overview: uz
      ? "Yer insoniyat uchun yashashga yaroqsiz bo'lib bormoqda. Sobiq uchuvchi Kuper yangi uy izlab boshqa galaktikaga yo'l oladi."
      : "With Earth becoming uninhabitable, former pilot Cooper travels through a wormhole to find humanity a new home.",
    tagline: uz ? "Yer insoniyat uchun yashashga yaroqsiz bo'lib bormoqda." : "With Earth becoming uninhabitable, Cooper looks for a new home.",
    trailer_url: "https://www.youtube.com/watch?v=example",
    url: "https://cinemind.example/movies/5",
  };
  return {
    ...movie,
    signature: "🎬 CineMind AI",
    hashtags: "#CineMind #kino",
    brand: "CineMind AI",
    week_range: uz ? "26-oktabr – 1-noyabr, 2026" : "October 26 – November 1, 2026",
    movies: [
      { ...movie, index: 1 },
      { ...movie, index: 2, title: uz ? "Koko" : "Coco", year: 2017, genres: uz ? "Animatsiya" : "Animation", tagline: uz ? "Migel musiqachi bo'lishni orzu qiladi." : "Miguel dreams of becoming a musician." },
    ],
    facts: [{ index: 1, text: uz ? "Namuna fakt matni." : "Sample fact text.", source: "Example source — https://example.org" }],
  };
}
