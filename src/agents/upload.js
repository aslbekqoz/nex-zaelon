// 4-AGENT (2-qism): YouTube'ga yuklash (OAuth refresh token bilan).
// Natija: upload.json
import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { config } from '../config.js';
import { log } from '../lib/log.js';
import { readJson, writeJson } from '../lib/util.js';
import { scheduling, nextSlot, nextLongSlot, fmtSlot } from '../lib/schedule.js';

export function youtubeAuth() {
  if (!config.ytClientId || !config.ytClientSecret || !config.ytRefreshToken) {
    throw new Error('YouTube sozlanmagan: YOUTUBE_CLIENT_ID / SECRET / REFRESH_TOKEN (.env) — "npm run auth" ni bajaring');
  }
  const auth = new google.auth.OAuth2(config.ytClientId, config.ytClientSecret);
  auth.setCredentials({ refresh_token: config.ytRefreshToken });
  return auth;
}

export const youtubeClient = () => google.youtube({ version: 'v3', auth: youtubeAuth() });

export async function runUpload(runDir, outFile) {
  const meta = readJson(path.join(runDir, 'metadata.json'));
  if (config.mock) {
    log('📤 [MOCK] YouTube yuklash o\'tkazib yuborildi');
    return writeJson(outFile, { mock: true, videoId: null, url: null, at: new Date().toISOString() });
  }

  const yt = youtubeClient();
  // Rejalashtirish yoqilgan bo'lsa: "private" + publishAt — YouTube o'zi o'sha vaqtda ochadi
  const long = readJson(path.join(runDir, 'script.json')).format === 'long';
  const slot = long ? nextLongSlot() : (scheduling() ? nextSlot() : null);
  const status = slot
    ? { privacyStatus: 'private', publishAt: slot.toISOString(), selfDeclaredMadeForKids: false }
    : { privacyStatus: config.ytPrivacy, selfDeclaredMadeForKids: false };
  log(`📤 YouTube'ga yuklayapman...${slot ? ` (e'lon: ${fmtSlot(slot)})` : ''}`);
  const res = await yt.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: meta.categoryId, defaultLanguage: 'en', defaultAudioLanguage: 'en' },
      status,
    },
    media: { body: fs.createReadStream(path.join(runDir, 'video.mp4')) },
  });
  const videoId = res.data.id;
  const url = long ? `https://youtu.be/${videoId}` : `https://youtube.com/shorts/${videoId}`;
  const publishAt = res.data.status?.publishAt || null;
  log(`   ✅ Yuklandi: ${url} (holati: ${res.data.status?.privacyStatus}${publishAt ? `, e'lon: ${fmtSlot(new Date(publishAt))}` : ''})`);
  if (slot && !publishAt) log('   ⚠️  YouTube rejalashtirish vaqtini qabul qilmadi — video "private" holatda qoldi, Studio\'da tekshiring');

  // Thumbnail — xato bersa ham to'xtamaymiz (Shorts va tasdiqlanmagan kanallarda cheklovlar bor)
  try {
    await yt.thumbnails.set({ videoId, media: { mimeType: 'image/jpeg', body: fs.createReadStream(path.join(runDir, 'thumbnail.jpg')) } });
    log('   ✅ Thumbnail o\'rnatildi');
  } catch (err) {
    log(`   ⚠️  Thumbnail o'rnatilmadi: ${err.message.slice(0, 150)}`);
  }

  writeJson(outFile, { videoId, url, kind: long ? 'long' : 'short', privacy: res.data.status?.privacyStatus, publishAt, at: new Date().toISOString() });
}
