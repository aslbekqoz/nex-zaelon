# CineMind AI — amalga oshirish rejasi

Yangilangan: 2026-10-27

## Joriy versiya doirasi

CineMind AI — mustaqil kino platformasi. Ustuvor yo'nalishlar:

1. Kino platformasi: bosh sahifa, haqiqiy film qidiruvi, janr filtrlari, batafsil sahifalar, treylerlar, o'xshash filmlar.
2. Aqlli tavsiyalar: kayfiyat, janr va foydalanuvchi afzalliklari asosida.
3. **CineMind Content Studio**: sayt ichida kontent tayyorlash (film kartalari, tavsiflar, haftalik ro'yxatlar, faktlar).
4. Ma'lumotlar bazasi va boshqaruv paneli: PostgreSQL, o'zbekcha nomlar, shaxsiy ro'yxatlar, shablonlar, administrator sozlamalari.

### Doiradan tashqari (ataylab)

**Telegram integratsiyasi joriy versiyaga kirmaydi.** Bot API, bot tokenlari, kanal ruxsatlari, avtomatik e'lon qilish, webhook'lar va Telegram'ga xos backend kodi yo'q. Kelajakda kerak bo'lmaguncha Telegram uchun xizmatlar, jadvallar, muhit o'zgaruvchilari yoki kutubxonalar **yaratilmaydi**.

Content Studio hech qanday tashqi platformaga avtomatik e'lon qilmaydi. Natija sayt ichida tahrirlanadi, saqlanadi va nusxalanadi.

## Arxitektura

- **Next.js 16 (App Router) + TypeScript**: server komponentlar va server action'lar. Alohida API serveri kerak emas.
- **PostgreSQL** (`pg` drayveri): sxema `db/migrations/*.sql` fayllarida, `npm run db:migrate` bilan qo'llanadi. ORM yo'q, so'rovlar repozitoriy modullarida turadi.
- **Autentifikatsiya**: email va parol (bcrypt). Sessiyalar bazada saqlanadi (tokenning faqat SHA-256 xeshi), brauzerda httpOnly cookie turadi.
- **Film ma'lumotlari**: mahalliy katalog asosiy manba. `TMDB_API_KEY` berilsa, qidiruv TMDB'dan yangi filmlarni katalogga qo'shadi, batafsil sahifalar esa poster, reyting, davomiylik, rejissyor va treyler bilan boyitiladi. TMDB ishlamay qolsa ham, sayt mahalliy katalog bilan ishlashda davom etadi.

Modullar domen bo'yicha ajratilgan va bir-biriga faqat ochiq funksiyalar orqali murojaat qiladi:

```
src/lib/
  db.ts              ulanishlar havzasi
  auth/              sessiyalar, kirish/ro'yxatdan o'tish
  movies/            katalog repozitoriysi, TMDB mijozi, sinxronlash
  watchlist/         shaxsiy ro'yxatlar
  (keyin) recommend/ tavsiya algoritmlari
  (keyin) studio/    Content Studio: shablonlar, qoralamalar, formatlovchilar
```

### Kelajakdagi integratsiyalar uchun kengayish nuqtasi

Content Studio natijasi platformaga bog'liq bo'lmagan `ContentDraft` yozuvi bo'ladi: sarlavha, tanasi, film havolalari va brend imzosi. Uni matnga aylantirish **formatlovchilar** vazifasi (oddiy matn, Markdown, HTML).

Kelajakda biror platformaga (masalan, Telegram'ga) e'lon qilish kerak bo'lsa, yangi `src/lib/integrations/<platforma>/` moduli qo'shiladi. U tayyor qoralamani o'qib, o'z formatlovchisi orqali yuboradi. Asosiy kino ilovasi, katalog va studiya sxemasi o'zgarmaydi; faqat yangi modul, uning sozlamalari va kerak bo'lsa alohida migratsiya qo'shiladi. Hozir bu modul uchun **hech qanday kod yozilmaydi**.

## Bosqichlar

### 1-bosqich: asos ✅ (shu commit)
- [x] Loyiha tuzilmasi, Docker orqali PostgreSQL, migratsiyalar va seed (19 ta janr, o'zbekcha nom va tavsifli 30 ta film)
- [x] Ro'yxatdan o'tish, kirish, chiqish, himoyalangan sahifalar, xavfsiz `next` yo'naltirish
- [x] Qidiruv: o'zbekcha, asl va inglizcha nomlar bo'yicha; xatoga chidamli (`pg_trgm`); janr filtri; saralash; sahifalash
- [x] TMDB integratsiyasi (ixtiyoriy): qidiruvdan import, batafsil ma'lumotlarni sinxronlash, yil bo'yicha moslik tekshiruvi
- [x] Bosh sahifa (tavsiya etilgan film, janrlar, tematik qatorlar)
- [x] Batafsil sahifa: treyler (YouTube embed yoki qidiruv havolasi), rejissyor, davomiylik, janrlar, o'xshash filmlar
- [x] Ro'yxatim (watchlist): qo'shish, olib tashlash, "ko'rdim" belgisi
- [x] Moslashuvchan qorong'i interfeys (telefon, planshet, kompyuter)

### 2-bosqich: kino tajribasini chuqurlashtirish
- Yil oralig'i, til va reyting bo'yicha filtrlar
- Aktyorlar va ijodiy guruh (TMDB credits), aktyor sahifasi
- TMDB trend va mashhur filmlarni administrator importi
- Filmlarning o'zbekcha nomi va tavsifini tahrirlash (administrator)
- Rasmlarni optimallashtirish (`next/image` va TMDB o'lchamlari)

### 3-bosqich: tavsiya tizimi
- Ilk kirishda yoqtirgan janr va filmlarni tanlash
- `user_ratings` jadvali: filmga baho qo'yish (1–10)
- Kontentga asoslangan baholash: janrlar vektori, rejissyor, yil, reyting, mashhurlik. Ro'yxat va baholar foydalanuvchi profilini yangilaydi
- Kayfiyat bo'yicha tavsiya: kayfiyatlarni janr va xususiyat og'irliklariga xaritalash ("kulgim kelyapti" → komediya, animatsiya...)
- "Nega tavsiya qilindi" izohi va bosh sahifada shaxsiy qator

### 4-bosqich: CineMind Content Studio
- Jadvallar: `studio_templates`, `studio_drafts`, `studio_facts` (manba URL, tekshiruv holati: tekshirilmagan / tasdiqlangan / rad etilgan), `brand_settings`
- Generatorlar: film kartasi, film tavsifi, haftalik kinolar ro'yxati, qiziqarli faktlar (manba havolasi bilan)
- O'zbek tilidagi tahririy kontent
- Tahrirlash, oldindan ko'rish, qoralamani saqlash, formatlangan matnni nusxalash, shablonlardan qayta foydalanish
- AI yordamida matn yaratish (Claude API) ixtiyoriy: kalit faqat shu bosqichda qo'shiladi. Faktlar manbasiz va "tasdiqlangan" belgisisiz chiqarilmaydi
- Tashqi platformalarga avtomatik e'lon qilinmaydi

### 5-bosqich: boshqaruv paneli
- Administrator bo'limi (rol tekshiruvi `users.role`)
- Brend imzosi va formatlash sozlamalari, shablonlarni boshqarish
- Foydalanuvchilar ro'yxati, filmlarni qo'lda qo'shish va tahrirlash
- Xavfsizlik: kirish urinishlarini cheklash (rate limit), audit jurnali

## Ma'lum cheklovlar (1-bosqich)
- Seed filmlarda reyting, poster va treyler yo'q: ular faqat TMDB kaliti bilan to'ldiriladi (taxminiy raqamlar ataylab kiritilmagan). Poster o'rnida rangli gradient ko'rsatiladi.
- Seed filmlarda chiqish sanasi o'rniga faqat yil ma'lum (`YYYY-01-01` sifatida saqlanadi, interfeysda faqat yil ko'rinadi).
- Kirish urinishlariga hali cheklov qo'yilmagan (5-bosqich).
