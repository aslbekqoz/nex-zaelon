// 🆕 AGENT: Tahlilchi (YouTube Analytics)
// Har kuni bir marta: yuklangan videolarning natijasini oladi (ko'rishlar, necha foizi tomosha qilingan,
// obunachi) va stats.json ga yozadi. Bu ma'lumot:
//   1) mavzu tanlashda ishlatiladi — auditoriya yaxshi ko'rgan mavzu turlari ko'proq tanlanadi
//   2) har dushanba Telegram'ga haftalik hisobot bo'lib keladi
// Eslatma: YouTube statistikasi 2-3 kun kechikib keladi, shuning uchun 2 kundan eski videolar olinadi.
// Ruxsat kerak: yt-analytics.readonly (npm run auth ni qayta bajarish).
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { config, ROOT } from '../config.js';
import { log } from '../lib/log.js';
import { notify } from '../lib/telegram.js';
import { readJson, writeJson } from '../lib/util.js';
import { youtubeAuth } from './upload.js';

const STATS = path.join(ROOT, 'stats.json');
const DAY = 86_400_000;

function uploadedVideos() {
  const runs = config.paths.runs;
  if (!fs.existsSync(runs)) return [];
  return fs.readdirSync(runs).map((d) => {
    const up = path.join(runs, d, 'upload.json');
    const st = path.join(runs, d, 'status.json');
    if (!fs.existsSync(up)) return null;
    try {
      const u = readJson(up);
      if (!u.videoId) return null;
      const topic = fs.existsSync(st) ? readJson(st).topic : d;
      return { videoId: u.videoId, topic, kind: u.kind || 'short', url: u.url, publishedAt: u.publishAt || u.at };
    } catch { return null; }
  }).filter(Boolean);
}

export const readStats = () => (fs.existsSync(STATS) ? readJson(STATS) : { videos: [] });

// Statistikani yangilash (kuniga ko'pi bilan 1 marta)
export async function refreshStats({ force = false } = {}) {
  const prev = readStats();
  if (!force && prev.updatedAt && Date.now() - Date.parse(prev.updatedAt) < 20 * 3_600_000) return prev;

  const vids = uploadedVideos().filter((v) => Date.now() - Date.parse(v.publishedAt) > 2 * DAY);
  if (!vids.length) {
    writeJson(STATS, { ...prev, updatedAt: new Date().toISOString() });
    return readStats();
  }
  const api = google.youtubeAnalytics({ version: 'v2', auth: youtubeAuth() });
  const rows = new Map();
  for (let i = 0; i < vids.length; i += 50) {
    const chunk = vids.slice(i, i + 50);
    const res = await api.reports.query({
      ids: 'channel==MINE',
      startDate: '2026-01-01',
      endDate: new Date().toISOString().slice(0, 10),
      metrics: 'views,averageViewPercentage,averageViewDuration,likes,subscribersGained',
      dimensions: 'video',
      filters: `video==${chunk.map((v) => v.videoId).join(',')}`,
      maxResults: 200,
    });
    for (const r of res.data.rows || []) {
      rows.set(r[0], { views: r[1], avgViewPct: Math.round(r[2]), avgViewSec: Math.round(r[3]), likes: r[4], subs: r[5] });
    }
  }
  const videos = vids.map((v) => ({ ...v, ...(rows.get(v.videoId) || { views: 0, avgViewPct: 0, avgViewSec: 0, likes: 0, subs: 0 }) }));
  const out = { ...prev, updatedAt: new Date().toISOString(), videos };
  writeJson(STATS, out);
  log(`📊 Tahlilchi: ${videos.length} ta video statistikasi yangilandi`);
  return out;
}

// Mavzu tanlash uchun xulosa: qaysi mavzular auditoriyaga yoqdi / yoqmadi
export function insights(kind = 'short') {
  const v = readStats().videos.filter((x) => x.kind === kind && x.views > 0);
  if (v.length < 3) return null;
  // Shorts'da eng muhim ko'rsatkich — necha foizi tomosha qilingani (retention), keyin ko'rishlar
  const score = (x) => x.avgViewPct * Math.log10(x.views + 10);
  const sorted = [...v].sort((a, b) => score(b) - score(a));
  const n = Math.max(1, Math.floor(v.length / 3));
  const fmt = (x) => `${x.topic} (${x.views} views, ${x.avgViewPct}% watched)`;
  return { best: sorted.slice(0, n).map(fmt), worst: sorted.slice(-n).map(fmt) };
}

// Haftalik hisobot (dushanba yoki undan keyingi birinchi ishga tushishda, haftada 1 marta)
export async function weeklyReport() {
  const s = readStats();
  const now = new Date();
  if (s.lastReportAt && Date.now() - Date.parse(s.lastReportAt) < 6.5 * DAY) return;
  if (s.lastReportAt === undefined && now.getDay() !== 1) return; // birinchi hisobot — dushanba kuni
  const week = s.videos.filter((x) => Date.now() - Date.parse(x.publishedAt) < 9 * DAY);
  const all = s.videos;
  if (!all.length) return;
  const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
  const top = [...all].sort((a, b) => b.views - a.views).slice(0, 3);
  const ins = insights('short');
  const lines = [
    '📊 <b>Haftalik hisobot — Did You Know Lab</b>',
    '',
    `So'nggi hafta: ${week.length} ta video, ${sum(week, 'views')} ko'rish, +${sum(week, 'subs')} obunachi`,
    `Jami: ${all.length} ta video, ${sum(all, 'views')} ko'rish, +${sum(all, 'subs')} obunachi`,
    '',
    '🏆 Eng ko\'p ko\'rilgan:',
    ...top.map((x, i) => `${i + 1}. ${x.topic} — ${x.views} ko'rish, ${x.avgViewPct}% tomosha (${x.url})`),
  ];
  if (ins) lines.push('', `✅ Auditoriyaga yoqqan: ${ins.best.map((b) => b.split(' (')[0]).join(', ')}`,
    `⚠️ Kamroq yoqqan: ${ins.worst.map((b) => b.split(' (')[0]).join(', ')}`, '', 'Yangi mavzular shunga qarab tanlanadi.');
  await notify(lines.join('\n'));
  writeJson(STATS, { ...readStats(), lastReportAt: now.toISOString() });
  log('📊 Haftalik hisobot Telegram\'ga yuborildi');
}

// Orkestrator chaqiradi: hech qachon asosiy ishni to'xtatmaydi
export async function runAnalytics() {
  if (config.mock) return;
  try {
    await refreshStats();
    await weeklyReport();
  } catch (err) {
    const msg = String(err.message);
    if (/insufficient|scope|permission|forbidden|has not been used|disabled/i.test(msg)) {
      log('📊 Tahlilchi: ruxsat yo\'q — YouTube Analytics API ni yoqing va "npm run auth" ni qayta bajaring');
    } else {
      log(`📊 Tahlilchi: statistika olinmadi (${msg.slice(0, 120)})`);
    }
  }
}
