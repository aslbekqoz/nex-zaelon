// AGENT 4: Nashriyotchi — sarlavha/tavsif (Claude Docs rejasidagi shablonlar), e'lon vaqtini tanlash
// va YouTube'ga (Nex Zaelon kanaliga) rejalashtirilgan holda yuklash.
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { config } from '../config.js';
import { log } from '../lib/log.js';
import { readJson, writeJson } from '../lib/util.js';
import { nex, groupOf } from './config.js';

const TZ_OFFSET = '+05:00';
const tashkentDate = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });

// ---------- Metadata ----------
export function buildMetadata(listen, index) {
  const g = groupOf(listen.genre);
  const line = listen.bestLine;
  const titles = [
    line ? `"${line}" — ${listen.title} | ${nex.channelName}` : null,
    `${listen.title} (lyrics) — ${listen.genre} | ${nex.channelName}`,
    `POV: it's 2am and this song hits different — ${listen.title}`,
  ].filter(Boolean);
  let title = titles[index % titles.length];
  if (title.length > 100) title = titles[1].slice(0, 100);
  const genreTag = listen.genre.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '');
  const moodTag = (listen.mood.split(/[ ,]+/)[0] || 'vibes').toLowerCase().replace(/[^a-z0-9]+/gi, '');
  const hashtags = [...new Set([genreTag, ...g.tags.slice(0, 2), 'lyrics', moodTag, 'originalmusic', 'shorts'].filter(Boolean))]
    .map((t) => `#${t}`).join(' ');
  const chorusLines = listen.lyrics.filter((l) => l.start >= listen.chorus.start - 0.5 && l.start <= listen.chorus.end).map((l) => l.text);
  const description =
    `${listen.title} — ${nex.channelName} (original song)\n\n` +
    (chorusLines.length ? `Lyrics:\n${chorusLines.join('\n')}\n\n` : '') +
    'Music created with AI (Google Flow). Original track, not a cover.\n' +
    'Full version & more: https://www.youtube.com/@NexZaelonEdits\n\n' + hashtags;
  const tags = [...new Set([listen.title, listen.genre, ...g.tags, 'lyrics', 'original song', 'ai music', nex.channelName])].slice(0, 15);
  return { title, description: description.slice(0, 4900), tags, categoryId: '10' };
}

// ---------- E'lon vaqti ----------
// Kanalda allaqachon rejalashtirilgan videolar (laptopdan ham, bulutdan ham yuklanganlar) — YouTube'dan o'qiladi
const remote = new Map();
export let remoteCount = null;
export async function loadRemoteSlots() {
  if (config.mock) return;
  try {
    const yt = nexYoutube();
    const ch = await yt.channels.list({ part: ['contentDetails'], mine: true });
    const uploads = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return;
    const pl = await yt.playlistItems.list({ part: ['contentDetails'], playlistId: uploads, maxResults: 50 });
    remoteCount = pl.data.pageInfo?.totalResults ?? null;
    const ids = (pl.data.items || []).map((i) => i.contentDetails.videoId);
    if (!ids.length) return;
    const v = await yt.videos.list({ part: ['status'], id: ids });
    for (const it of v.data.items || []) {
      if (it.status?.publishAt) remote.set(Date.parse(it.status.publishAt), { dir: `youtube:${it.id}`, template: null });
    }
    log(`📺 Kanalda ${remote.size} ta rejalashtirilgan video, jami ${remoteCount ?? '?'} ta`);
  } catch (err) {
    log(`   ⚠️  Kanaldagi rejalarni o'qib bo'lmadi (${String(err.message).slice(0, 80)}) — faqat mahalliy ma'lumot ishlatiladi`);
  }
}

// Band qilingan vaqtlar: yuklangan (upload.json) yoki band qilingan (slot.json) barcha qo'shiqlar + kanaldagilar
function takenSlots() {
  const runs = nex.paths.runs;
  const m = new Map(remote);
  if (!fs.existsSync(runs)) return m;
  for (const d of fs.readdirSync(runs)) {
    for (const f of ['upload.json', 'slot.json']) {
      const p = path.join(runs, d, f);
      if (!fs.existsSync(p)) continue;
      try { const j = readJson(p); if (j.publishAt) m.set(Date.parse(j.publishAt), { dir: d, template: j.template }); } catch { /* buzilgan fayl */ }
    }
  }
  return m;
}

// Rejadagi vaqt (bo'sh va kelajakda bo'lsa) yoki navbatdagi bo'sh slot (12:00, 18:00, 23:00)
export function chooseSlot(planEntry, now = Date.now()) {
  const taken = takenSlots();
  const lead = now + 60 * 60_000;
  if (planEntry?.date && planEntry?.time) {
    const t = Date.parse(`${planEntry.date}T${planEntry.time}:00${TZ_OFFSET}`);
    if (t > lead && !taken.has(t)) return new Date(t);
  }
  for (let day = 0; day < 90; day++) {
    const date = tashkentDate(new Date(now + day * 86_400_000));
    for (const hm of nex.slots) {
      const t = Date.parse(`${date}T${hm}:00${TZ_OFFSET}`);
      if (t > lead && !taken.has(t)) return new Date(t);
    }
  }
  throw new Error('Bo\'sh e\'lon vaqti topilmadi');
}

// Shablon: rejadagisi; bo'lmasa janrga mosi; bir kunda bir xil shablon ikki marta bo'lmasin
export function chooseTemplate(planEntry, genre, slot) {
  if (planEntry?.template) return planEntry.template;
  const day = tashkentDate(slot);
  const usedToday = new Set([...takenSlots()].filter(([t]) => tashkentDate(new Date(t)) === day).map(([, v]) => v.template));
  const preferred = groupOf(genre).templates[0];
  if (!usedToday.has(preferred)) return preferred;
  return [1, 2, 3, 4].find((t) => !usedToday.has(t)) || preferred;
}

// ---------- YouTube ----------
export function nexYoutube() {
  if (!config.ytClientId || !config.ytClientSecret || !nex.refreshToken) {
    throw new Error('Nex Zaelon kanali ulanmagan: "npm run nex:auth" ni bajaring (NEX_YOUTUBE_REFRESH_TOKEN)');
  }
  const auth = new google.auth.OAuth2(config.ytClientId, config.ytClientSecret);
  auth.setCredentials({ refresh_token: nex.refreshToken });
  return google.youtube({ version: 'v3', auth });
}

export async function runUpload(runDir, slot) {
  const meta = readJson(path.join(runDir, 'metadata.json'));
  if (config.mock) {
    log('📤 [MOCK] yuklash o\'tkazib yuborildi');
    return writeJson(path.join(runDir, 'upload.json'), { mock: true, publishAt: slot.toISOString(), at: new Date().toISOString() });
  }
  log(`📤 Nex Zaelon kanaliga yuklayapman (e'lon: ${slot.toISOString()})`);
  const res = await nexYoutube().videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: meta.categoryId },
      status: {
        privacyStatus: 'private',
        publishAt: slot.toISOString(),
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: true, // "Altered or synthetic content" — AI musiqa ekani rostdan belgilanadi
      },
    },
    media: { body: fs.createReadStream(path.join(runDir, 'video.mp4')) },
  });
  const id = res.data.id;
  const out = { videoId: id, url: `https://youtube.com/shorts/${id}`, publishAt: res.data.status?.publishAt || null, privacy: res.data.status?.privacyStatus, at: new Date().toISOString() };
  writeJson(path.join(runDir, 'upload.json'), out);
  log(`   ✅ ${out.url} (${out.privacy}${out.publishAt ? `, e'lon ${out.publishAt}` : ''})`);
  if (!out.publishAt) log('   ⚠️  YouTube rejalashtirish vaqtini qabul qilmadi — video "private" holatda, Studio\'da tekshiring');
}
