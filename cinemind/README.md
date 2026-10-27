# 🎬 CineMind AI

Professional kino platformasi: filmlarni qidirish, janrlar bo'yicha saralash, treylerlar, o'xshash filmlar va shaxsiy ro'yxat. Keyingi bosqichlarda aqlli tavsiyalar va sayt ichidagi **Content Studio** qo'shiladi.

Bosqichlar va arxitektura: [`docs/PLAN.md`](docs/PLAN.md).

> Bu papka repozitoriydagi YouTube agent tizimidan butunlay mustaqil. Uning o'z `package.json` fayli bor va u tashqaridagi kodga tegmaydi.

## Ishga tushirish

Talablar: Node.js 22.9+ va PostgreSQL 14+ (eng osoni Docker orqali).

```bash
cd cinemind
cp .env.example .env
docker compose up -d        # PostgreSQL 16 ni ishga tushiradi
npm install
npm run db:setup            # jadvallarni yaratadi va boshlang'ich filmlarni qo'shadi
npm run dev                 # http://localhost:3000
```

O'zingizning PostgreSQL serveringiz bo'lsa, `.env` faylidagi `DATABASE_URL` qatorini o'zgartiring.

### Haqiqiy film ma'lumotlari (TMDB)

Kalitsiz ham platforma boshlang'ich katalog (30 ta mashhur film, o'zbekcha nom va tavsiflar bilan) asosida to'liq ishlaydi. Haqiqiy posterlar, reytinglar, treylerlar va istalgan filmni qidirish uchun:

1. https://www.themoviedb.org saytida bepul akkaunt oching
2. **Settings → API** bo'limida kalit oling (v3 API key yoki v4 Read Access Token, ikkalasi ham ishlaydi)
3. Kalitni `.env` faylidagi `TMDB_API_KEY=` qatoriga yozing va serverni qayta ishga tushiring

Shundan keyin qidiruv TMDB'dan topilgan filmlarni katalogga qo'shadi. Film sahifasi birinchi marta ochilganda esa poster, reyting, davomiylik, rejissyor va treyler to'ldiriladi. O'zbekcha nom va tavsiflar ustidan yozilmaydi.

### Administrator

Saytda ro'yxatdan o'ting, keyin:

```bash
npm run admin:create -- siz@example.com
```

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` / `npm start` | Production build va ishga tushirish |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm run db:migrate` | Yangi migratsiyalarni qo'llash |
| `npm run db:seed` | Janr va boshlang'ich filmlarni yozish (qayta ishga tushirish xavfsiz) |

## Tuzilma

```
db/migrations/        SQL migratsiyalar
scripts/              migratsiya, seed, administrator
src/app/              sahifalar (bosh sahifa, qidiruv, film, kirish, ro'yxat)
src/components/       interfeys komponentlari
src/lib/auth/         sessiyalar va autentifikatsiya
src/lib/movies/       katalog, TMDB mijozi, sinxronlash
src/lib/watchlist/    shaxsiy ro'yxatlar
```
