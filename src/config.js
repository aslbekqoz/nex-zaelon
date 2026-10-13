// Barcha sozlamalar bitta joyda. Qiymatlar .env faylidan olinadi.
import dns from 'node:dns';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Ba'zi tarmoqlarda IPv6 ishlamaydi -> har doim avval IPv4 orqali ulanamiz
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(true);
net.setDefaultAutoSelectFamilyAttemptTimeout(1000);

const env = process.env;
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  mock: env.MOCK === '1', // MOCK=1 -> hech qanday API chaqirilmaydi, sinov uchun

  geminiKey: env.GEMINI_API_KEY || '',
  geminiModels: (env.GEMINI_MODELS || 'gemini-3.1-flash-lite,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.8-flash,gemini-3.5-flash')
    .split(',').map((s) => s.trim()).filter(Boolean),

  cfAccountId: env.CLOUDFLARE_ACCOUNT_ID || '',
  cfToken: env.CLOUDFLARE_API_TOKEN || '',

  ttsVoice: env.TTS_VOICE || 'en-US-AndrewNeural',

  tgToken: env.TELEGRAM_BOT_TOKEN || '',
  tgChatId: env.TELEGRAM_CHAT_ID || '',
  approvalTimeoutMin: Number(env.APPROVAL_TIMEOUT_MIN || 15),
  approvalDefault: (env.APPROVAL_DEFAULT || 'approve').toLowerCase(),

  ytClientId: env.YOUTUBE_CLIENT_ID || '',
  ytClientSecret: env.YOUTUBE_CLIENT_SECRET || '',
  ytRefreshToken: env.YOUTUBE_REFRESH_TOKEN || '',
  ytPrivacy: env.YOUTUBE_PRIVACY || 'public',
  ytCategoryId: env.YOUTUBE_CATEGORY_ID || '27',

  // Rejalashtirish (src/lib/schedule.js): bo'sh bo'lsa — video darhol e'lon qilinadi
  publishSlots: (env.PUBLISH_SLOTS || '').split(',').map((s) => s.trim()).filter((s) => /^\d{2}:\d{2}$/.test(s)).sort(),
  bufferDays: Number(env.BUFFER_DAYS || 7),
  maxPerDay: Number(env.MAX_PER_DAY || 5),
  // Uzun (16:9) videolar: "sat-18:00" yoki "wed-18:00,sat-18:00". Bo'sh = uzun video yo'q
  longSlots: (env.LONG_SLOTS || '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => /^(sun|mon|tue|wed|thu|fri|sat)-\d{2}:\d{2}$/.test(s)),
  longWords: Number(env.LONG_WORDS || 950), // ~7 daqiqa
  longLeadDays: Number(env.LONG_LEAD_DAYS || 3), // e'londan necha kun oldin tayyorlansin

  scriptWords: Number(env.SCRIPT_WORDS || 105),
  // sahnalar soni: har ~12 so'zga bitta sahna (tez temp), kamida SCENES
  scenes: Math.max(Number(env.SCENES || 0), Math.round(Number(env.SCRIPT_WORDS || 105) / 12)),
  imageModel: env.IMAGE_MODEL || 'flux-2-klein-4b',
  characterRef: env.CHARACTER_REF === '1', // qahramon namunasi-rasm usuli (ixtiyoriy)

  paths: {
    runs: path.join(ROOT, 'runs'),
    topics: path.join(ROOT, 'topics.txt'),
    topicsLong: path.join(ROOT, 'topics_long.txt'),
    done: path.join(ROOT, 'done.txt'),
    music: path.join(ROOT, 'music'),
  },
};
