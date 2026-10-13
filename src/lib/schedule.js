// REJALASHTIRISH: videolar oldindan tayyorlanib, YouTube'ga "rejalashtirilgan" holda yuklanadi.
// YouTube o'zi belgilangan vaqtda e'lon qiladi — o'sha paytda kompyuter yoqiq bo'lishi shart emas.
//
// .env:
//   PUBLISH_SLOTS=02:00,09:30,22:00   — har kungi e'lon vaqtlari (Toshkent vaqti). Bo'sh = darhol e'lon qilish
//   BUFFER_DAYS=7                      — necha kun oldinga tayyorlab qo'yish
//   MAX_PER_DAY=5                      — bir kunda ko'pi bilan nechta video yasash (Cloudflare bepul limiti uchun)
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { readJson } from './util.js';

const TZ = 'Asia/Tashkent';
const OFFSET = '+05:00'; // Toshkentda yozgi vaqt yo'q — doim UTC+5
const MIN_LEAD_MS = 60 * 60_000; // e'lon vaqti kamida 1 soat keyin bo'lsin (YouTube videoni qayta ishlashga ulgursin)

export const scheduling = () => config.publishSlots.length > 0;
export const tashkentDate = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: TZ });

// Barcha yuklangan videolar (upload.json) — rejalashtirilgan vaqtlari bilan
function uploads() {
  const runs = config.paths.runs;
  if (!fs.existsSync(runs)) return [];
  return fs.readdirSync(runs)
    .map((d) => path.join(runs, d, 'upload.json'))
    .filter((f) => fs.existsSync(f))
    .map((f) => { try { return readJson(f); } catch { return null; } })
    .filter(Boolean);
}

const isLong = (u) => u.kind === 'long';

// Hali e'lon qilinmagan (kelajakdagi) rejalashtirilgan videolar (kind: 'short' | 'long')
export function scheduledAhead(now = Date.now(), kind = 'short') {
  return uploads().filter((u) => (kind === 'long') === isLong(u) && u.publishAt && Date.parse(u.publishAt) > now).map((u) => u.publishAt).sort();
}

// Bugun (Toshkent vaqti) nechta Shorts yuklandi. Bugun uzun video yasalgan bo'lsa — u 3 ta Shorts'ga teng
// hisoblanadi (rasmlari ko'p, Cloudflare limitini ko'p yeydi).
export function uploadedToday() {
  const today = tashkentDate();
  const shorts = uploads().filter((u) => !isLong(u) && u.at && tashkentDate(new Date(u.at)) === today).length;
  const runs = config.paths.runs;
  const longToday = fs.existsSync(runs) ? fs.readdirSync(runs).filter((d) => d.startsWith(today) && d.includes('_long')).length : 0;
  return shorts + longToday * 3;
}

// Navbatdagi bo'sh e'lon vaqti: hozirdan kamida 1 soat keyingi, hali band qilinmagan eng yaqin slot
export function nextSlot(now = Date.now()) {
  const taken = new Set(scheduledAhead(now).map((t) => Date.parse(t)));
  for (let day = 0; day < 60; day++) {
    const date = tashkentDate(new Date(now + day * 86_400_000));
    for (const hm of config.publishSlots) {
      const t = Date.parse(`${date}T${hm}:00${OFFSET}`);
      if (t >= now + MIN_LEAD_MS && !taken.has(t)) return new Date(t);
    }
  }
  return null;
}

// Yangi video yasash kerakmi? (bufer to'lgan yoki bugungi limit tugagan bo'lsa — yo'q)
export function needMore(now = Date.now()) {
  const slot = nextSlot(now);
  if (!slot) return { ok: false, why: 'bo\'sh slot topilmadi' };
  const ahead = scheduledAhead(now).length;
  if (slot.getTime() > now + config.bufferDays * 86_400_000) {
    return { ok: false, why: `bufer to'la: ${ahead} ta video ${config.bufferDays} kunga rejalashtirilgan` };
  }
  const today = uploadedToday();
  if (today >= config.maxPerDay) return { ok: false, why: `bugungi limit: ${today}/${config.maxPerDay} ta video yasaldi` };
  return { ok: true, slot, ahead };
}

// ---------- UZUN VIDEOLAR (LONG_SLOTS=sat-18:00) ----------
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function nextLongSlot(now = Date.now()) {
  if (!config.longSlots.length) return null;
  const taken = new Set(scheduledAhead(now, 'long').map((t) => Date.parse(t)));
  for (let day = 0; day < 60; day++) {
    const d = new Date(now + day * 86_400_000);
    const date = tashkentDate(d);
    const dow = DOW[new Date(`${date}T12:00:00${OFFSET}`).getUTCDay()];
    for (const slot of config.longSlots) {
      const [sd, hm] = slot.split('-');
      if (sd !== dow) continue;
      const t = Date.parse(`${date}T${hm}:00${OFFSET}`);
      if (t >= now + MIN_LEAD_MS && !taken.has(t)) return new Date(t);
    }
  }
  return null;
}

// Uzun video tayyorlash vaqti keldimi? (navbatdagi uzun slotgacha LONG_LEAD_DAYS kundan kam qolgan bo'lsa)
export function needLong(now = Date.now()) {
  const slot = nextLongSlot(now);
  if (!slot) return { ok: false, why: 'LONG_SLOTS yo\'q' };
  if (slot.getTime() > now + config.longLeadDays * 86_400_000) return { ok: false, why: `uzun video hali erta (${fmtSlot(slot)})` };
  const urgent = slot.getTime() - now < 30 * 3_600_000; // e'longa 30 soatdan kam qoldi — kutib bo'lmaydi
  if (!urgent && uploadedToday() > 0) return { ok: false, why: 'bugun allaqachon video yasalgan — uzun video ertaga ertalab boshlanadi' };
  return { ok: true, slot };
}

// "9-okt, Pay 09:30" ko'rinishida
export function fmtSlot(d) {
  const months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
  const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return `${p.day}-${months[Number(p.month) - 1]}, ${days[wd]} ${p.hour}:${p.minute}`;
}
