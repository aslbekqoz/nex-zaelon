// NEX ZAELON — bulut (GitHub Actions) uchun yordamchi. Laptop kerak emas.
//   node src/nex/cloud.js pull     -> Telegram botga yuborilgan qo'shiqlarni nex-inbox/ ga yuklab oladi,
//                                     ish bor-yo'qligini GITHUB_OUTPUT ga yozadi (work=1/0)
//   node src/nex/cloud.js cleanup  -> yuklangan qo'shiqlarning og'ir fayllarini o'chiradi (kesh kichik bo'lsin)
//
// Telefondan ishlash: Flow'da qo'shiq yaratasiz -> mp3 ni Telegram botga FAYL qilib yuborasiz,
// izohiga (caption) rejadagi nomni yozasiz, masalan: Slow Motion. Qolganini server qiladi.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { readJson, slugify } from '../lib/util.js';
import { nex } from './config.js';

const AUDIO = /\.(mp3|wav|m4a|ogg|flac|aac)$/i;
const TG = (m) => `https://api.telegram.org/bot${config.tgToken}/${m}`;
for (const d of [nex.paths.inbox, nex.paths.processed, nex.paths.runs]) fs.mkdirSync(d, { recursive: true });

async function tg(method, params) {
  const res = await fetch(TG(method), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description}`);
  return data.result;
}
const reply = (msg, text) => tg('sendMessage', { chat_id: msg.chat.id, text, reply_to_message_id: msg.message_id }).catch(() => {});

const plan = fs.existsSync(nex.paths.plan) ? readJson(nex.paths.plan).tracks : [];
const planFor = (name) => plan.find((p) => (slugify(p.title) && slugify(name).includes(slugify(p.title))) || name.toLowerCase().includes(p.title.toLowerCase())) || null;
const safeName = (s) => String(s).replace(/[\\/:*?"<>|\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

async function pull() {
  if (!config.tgToken || !config.tgChatId) { console.log('Telegram sozlanmagan — faqat tugallanmagan ishlar tekshiriladi'); return 0; }
  const updates = await tg('getUpdates', { timeout: 0, allowed_updates: ['message'] });
  let got = 0;
  let maxId = 0;
  for (const u of updates) {
    maxId = Math.max(maxId, u.update_id);
    const msg = u.message;
    if (!msg || String(msg.chat.id) !== String(config.tgChatId)) continue; // faqat sizdan kelganlar
    const file = msg.audio || msg.document;
    if (!file) {
      if (msg.text && !msg.text.startsWith('/')) await reply(msg, 'Qo\'shiqni mp3 FAYL qilib yuboring, izohiga rejadagi nomini yozing (masalan: Slow Motion).');
      continue;
    }
    const orig = file.file_name || `${msg.audio?.title || 'track'}.mp3`;
    const isAudio = AUDIO.test(orig) || /^audio\//.test(file.mime_type || '');
    if (!isAudio) { await reply(msg, '⚠️ Bu audio fayl emas. mp3 yuboring.'); continue; }
    if (file.file_size > 20 * 1024 * 1024) { await reply(msg, '⚠️ Fayl 20 MB dan katta — Telegram bot uni yuklay olmaydi.'); continue; }
    const ext = (path.extname(orig) || '.mp3').toLowerCase();
    // Nom: izoh (caption) -> qo'shiq nomi (mp3 ichidagi teg) -> fayl nomi; rejaga mos kelgani afzal
    const names = [msg.caption, msg.audio?.title, path.parse(orig).name].map((x) => safeName(x || '')).filter(Boolean);
    const base = names.find((n) => planFor(n)) || names[0] || 'track';
    let dest = path.join(nex.paths.inbox, `${base}${ext}`);
    for (let i = 2; fs.existsSync(dest); i++) dest = path.join(nex.paths.inbox, `${base} (${i})${ext}`);
    try {
      const info = await tg('getFile', { file_id: file.file_id });
      const res = await fetch(`https://api.telegram.org/file/bot${config.tgToken}/${info.file_path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      // fayl vaqti = xabar vaqti (run.js navbatni shu bo'yicha tuzadi)
      fs.utimesSync(dest, new Date(msg.date * 1000), new Date(msg.date * 1000));
      got++;
      const p = planFor(base);
      await reply(msg, `📥 Qabul qilindi: ${base}\n` + (p ? `✅ Rejada: ${p.title} — ${p.genre}, shablon ${p.template}` : '⚠️ Rejada bunday nom yo\'q — janrni o\'zim aniqlayman') +
        '\n🎬 Montaj boshlandi, tayyor bo\'lgach havolani yuboraman.');
      console.log(`📥 ${path.basename(dest)}`);
    } catch (err) {
      await reply(msg, `❗ Faylni yuklab bo'lmadi (${err.message}). Qaytadan yuboring.`);
    }
  }
  if (maxId) await tg('getUpdates', { offset: maxId + 1, timeout: 0 }); // o'qilgan xabarlar qayta kelmasin
  return got;
}

function pendingRuns() {
  return fs.readdirSync(nex.paths.runs).filter((d) => {
    const st = path.join(nex.paths.runs, d, 'status.json');
    return fs.existsSync(st) && !['uploaded', 'skipped'].includes(readJson(st).status);
  });
}

function cleanup() {
  fs.rmSync(path.join(nex.paths.runs, '.lock'), { force: true });
  let n = 0;
  for (const d of fs.readdirSync(nex.paths.runs)) {
    const dir = path.join(nex.paths.runs, d);
    const st = path.join(dir, 'status.json');
    if (!fs.existsSync(st) || !['uploaded', 'skipped'].includes(readJson(st).status)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(json|txt)$/.test(f)) { fs.rmSync(path.join(dir, f), { force: true }); n++; }
    }
  }
  fs.rmSync(nex.paths.processed, { recursive: true, force: true }); // asl nusxalar run papkasida bor edi
  console.log(`🧹 ${n} ta og'ir fayl o'chirildi`);
}

const mode = process.argv[2] || 'pull';
if (mode === 'cleanup') {
  cleanup();
} else {
  const got = await pull();
  const inbox = fs.readdirSync(nex.paths.inbox).filter((f) => AUDIO.test(f)).length;
  const work = inbox + pendingRuns().length > 0;
  console.log(`Yangi: ${got}, inbox: ${inbox}, tugallanmagan: ${pendingRuns().length} -> ${work ? 'ISH BOR' : 'ish yo\'q'}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `work=${work ? 1 : 0}\n`);
}
