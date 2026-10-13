# 🎬 YouTube Shorts agent tizimi

5 ta agent mavzudan boshlab tayyor YouTube Shorts videosigacha bo'lgan butun ishni o'zi bajaradi:

```
topics.txt → 🔎 Tadqiqot → ✍️ Ssenariy → 🎬 Video → 📝 Metadata → 📲 Telegram ruxsat → 📤 YouTube
```

| Agent | Fayl | Vazifasi | Natija |
|---|---|---|---|
| 2 · Tadqiqotchi | `src/agents/research.js` | Wikipedia'dan faktlar topadi va har birini manbadagi aniq jumla bilan **tekshiradi**. Tasdiqlanmagan fakt tashlab yuboriladi | `research.json` |
| 1 · Ssenariynavis | `src/agents/script.js` | Hook → faktlar → eng zo'r fakt → CTA tuzilmasida ssenariy yozadi. Faqat `research.json`dagi faktlardan foydalanadi | `script.json` |
| 3 · Video | `src/agents/video.js` | Avval ovoz, keyin rasmlar, so'ng montaj, subtitr, musiqa va thumbnail | `video.mp4`, `thumbnail.jpg` |
| 4 · YouTube | `src/agents/metadata.js`, `upload.js` | Sarlavha, tavsif va manbalarni tayyorlaydi, videoni yuklaydi | `metadata.json`, `upload.json` |
| 5 · Telegram | `src/agents/approval.js` | Videoni sizga yuboradi va ✅/❌ tugmalarini kutadi. 15 daqiqada javob bo'lmasa, avtomatik yuklaydi | `approval.json` |
| Orkestrator | `src/orchestrator.js` | Agentlarni navbat bilan chaqiradi, xato bo'lsa 3 marta qayta urinadi, keyin Telegram orqali xabar beradi | `status.json`, `log.txt` |

Har bir video uchun alohida papka yaratiladi: `runs/2026-10-05_octopus/`. Biror bosqich xato bersa, keyingi ishga tushishda tizim **o'sha joydan** davom etadi, chunki oldingi bosqichlarning fayllari papkada saqlanib qoladi.

**Hamma xizmatlar bepul limitlarda ishlaydi:** Gemini (matn), Cloudflare Workers AI (rasm, kuniga 10 000 neuron, bu ~150 ta rasmga yetadi), Microsoft Edge ovozlari (kalit kerak emas).

---

## 1. O'rnatish (bir marta)

Terminalda quyidagilarni bajaring:

```bash
sudo apt install ffmpeg        # video montaj uchun
cd ~/Documents/youtube-agent
npm install
cp .env.example .env
```

Kalitlarsiz sinov ham qilib ko'rishingiz mumkin. Bu sinov rangli kvadratlar va haqiqiy ovoz bilan video yasaydi:

```bash
npm run mock
```

Natijani `runs/…/video.mp4` faylida ko'rasiz.

## 2. Kalitlarni olish va `.env` ga yozish

### 🔹 Gemini (matn uchun)
1. https://aistudio.google.com/apikey sahifasiga kiring va **Create API key** tugmasini bosing
2. Kalitni `.env` faylidagi `GEMINI_API_KEY=` qatoriga yozing

### 🔹 Cloudflare (rasmlar uchun)
1. https://dash.cloudflare.com saytida bepul akkaunt oching
2. **Account ID**ni toping (u bosh sahifaning o'ng tomonida, yoki **Workers AI** bo'limida turadi)
3. **My Profile → API Tokens → Create Token** yo'lidan o'tib, **Workers AI** shablonini tanlang
4. Ikkala qiymatni `.env` fayliga yozing

### 🔹 Telegram bot
1. Telegram'da **@BotFather** ga `/newbot` deb yozing va bot tokenini oling. Uni `TELEGRAM_BOT_TOKEN=` qatoriga yozing
2. O'zingiz yaratgan botga `/start` deb yozing
3. Terminalda `npm run telegram-id` buyrug'ini bajaring va chiqqan qatorni `.env` fayliga ko'chiring

### 🔹 YouTube (eng uzun qadam, lekin faqat bir marta qilinadi)
1. https://console.cloud.google.com saytida yangi loyiha yarating
2. **APIs & Services → Library → YouTube Data API v3 → Enable** ni bosing
3. **OAuth consent screen** bo'limida ilova turini **External** qilib belgilang, nomini yozing va o'z emailingizni kiriting
4. **Credentials → Create credentials → OAuth client ID → Desktop app** yo'lidan o'ting. Client ID va Secret'ni `.env` fayliga yozing
5. Terminalda `npm run auth` buyrug'ini bajaring, chiqqan havolani oching va kanalingiz bilan kiring. Token `.env` fayliga avtomatik yoziladi

> ⚠️ **Muhim 1:** consent screen **"Testing"** holatida qolsa, token **7 kunda** eskiradi. Shuning uchun **Publish app** tugmasini bosib, uni **In production** holatiga o'tkazing. Kirishda "Google hasn't verified this app" degan ogohlantirish chiqadi. Bu sizning o'z ilovangiz, shuning uchun **Advanced → Go to … (unsafe)** ni bosib davom etishingiz mumkin.
>
> ⚠️ **Muhim 2:** Google'ning **audit** tekshiruvidan o'tmagan API loyihalari orqali yuklangan videolarni YouTube **faqat private** holatda qoldiradi. Videolar ommaviy chiqishi uchun Google'ning "YouTube API Services – Audit and Quota Extension" arizasini to'ldirish kerak (uni Google Cloud Console'dagi YouTube Data API sahifasidan topasiz). Audit tasdiqlanguncha videolar yopiq yuklanadi va siz ularni YouTube Studio'da qo'lda **Public** qilasiz.

### ✅ Tekshirish

```bash
npm run check
```

Hamma qator ✅ bo'lsa, tizim ishga tayyor.

## 3. Ishga tushirish

```bash
npm start                         # topics.txt dagi navbatdagi mavzu
npm start -- --topic "Sharks"     # aniq bir mavzu
```

Mavzular `topics.txt` faylida turadi, har qatorda bittadan. Tayyor bo'lganlari `done.txt` fayliga ko'chiriladi.

**Video qanday yasaladi:** ssenariy agenti bitta doimiy qahramonni tasvirlaydi. Undan "namuna" rasm chiziladi va barcha sahnalar shu namunaga qarab chiziladi (FLUX.2 klein, vertikal 9:16). 5 soniyadan uzun sahna 2 ta rasmga bo'linadi. Har bir rasmda harakat bor, sahnalar orasida silliq o'tishlar bo'ladi, subtitr esa karaoke uslubida (aytilayotgan so'z sariq rangda yonadi, `fonts/Anton.ttf` shrifti bilan).

**Fon musiqasi (ixtiyoriy):** `music/` papkasini yarating va unga mualliflik huquqisiz mp3 fayllarni joylang, masalan, YouTube Studio → Audio Library'dan yuklab olinganlarni. Tizim har safar bittasini tasodifiy tanlaydi va diktor gapirayotganda musiqa ovozini avtomatik pasaytiradi.

## 4. Har kuni avtomatik ishga tushirish (cron)

```bash
crontab -e
```

Fayl oxiriga quyidagi ikki qatorni qo'shing:

```
# Har kuni 09:00 da yangi video
0 9 * * * cd /home/nexzaelon/Documents/youtube-agent && /home/nexzaelon/.nvm/versions/node/v20.20.2/bin/node --env-file=.env src/orchestrator.js >> cron.log 2>&1
# Har soatda: xato bilan to'xtagan ish bo'lsa, davom ettirish
30 * * * * cd /home/nexzaelon/Documents/youtube-agent && /home/nexzaelon/.nvm/versions/node/v20.20.2/bin/node --env-file=.env src/orchestrator.js --resume-only >> cron.log 2>&1
```

> Node yo'lini `which node` buyrug'i bilan tekshiring. Cron NVM'ni ko'rmaydi, shuning uchun to'liq yo'l yozilishi kerak.
> Cron faqat kompyuter yoqiq turganda ishlaydi.

## 5. Sozlash

`.env` faylida quyidagilarni o'zgartirishingiz mumkin:

* `TTS_VOICE` — ovoz. Boshqa variantlar: `en-US-GuyNeural`, `en-US-AriaNeural`, `en-GB-RyanNeural`
* `SCRIPT_WORDS`, `SCENES` — video uzunligi va sahnalar soni
* `APPROVAL_TIMEOUT_MIN`, `APPROVAL_DEFAULT` — Telegram'da qancha kutish va javob kelmasa nima qilish
* Rasm uslubi `src/agents/script.js` faylidagi `STYLE` qatorida turadi

## 6. Muammo bo'lsa

* Har bir videoning papkasida `log.txt` fayli bor. Unda nima bo'lgani qadamma-qadam yozilgan
* Biror bosqichni qayta qildirmoqchi bo'lsangiz, o'sha bosqich faylini o'chirib, `npm start`ni qayta ishga tushiring. Masalan, `script.json`ni o'chirsangiz, ssenariy qayta yoziladi. Video ham qayta yaratilishi uchun `video.mp4` va `scenes/` papkasini ham o'chiring
* Gemini 429 xatosi bersa, bepul limit tugagan bo'ladi. Ertasi kuni qayta urining yoki `GEMINI_MODELS` ro'yxatini o'zgartiring
* `.env` faylini **hech kimga bermang** va GitHub'ga joylamang
