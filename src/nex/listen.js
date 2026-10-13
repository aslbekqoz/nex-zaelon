// AGENT 1: Tinglovchi — qo'shiqni Gemini'ga "eshittiradi".
// Natija (listen.json): lirika qatorlari va ularning vaqti, naqarot qayerda, janr, kayfiyat,
// eng "ilinadigan" qator (sarlavha uchun) va muqova g'oyasi.
// Gemini naqarotni topa olmasa — eng baland 35 soniyalik joy olinadi (zaxira usul).
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { askJson } from '../lib/gemini.js';
import { ffmpeg, duration } from '../lib/ffmpeg.js';
import { log } from '../lib/log.js';
import { writeJson } from '../lib/util.js';

// "o'" uchun turli apostroflarni bitta oddiy belgiga keltiramiz (shriftda bor bo'lishi uchun)
const cleanText = (t) => String(t || '').replace(/[ʻʼ‘’`´]/g, "'").replace(/\s+/g, ' ').trim();

export async function runListen(audioFile, runDir, planEntry) {
  const out = path.join(runDir, 'listen.json');
  const dur = await duration(audioFile);
  const small = path.join(runDir, 'listen.mp3');
  await ffmpeg(['-i', audioFile, '-vn', '-ac', '1', '-ar', '22050', '-b:a', '64k', small]); // Gemini'ga yengil nusxa
  log(`🎧 Tinglovchi: ${path.basename(audioFile)} (${dur.toFixed(0)} soniya)`);

  let r = {};
  if (config.mock) {
    r = mockListen(dur);
  } else {
    r = await askJson({
      temperature: 0.2,
      system: 'You are a professional music editor and lyric transcriber. You listen carefully and report exact timestamps.',
      prompt:
        `Listen to this whole song (${dur.toFixed(1)} seconds long).` +
        (planEntry ? ` Planned title: "${planEntry.title}", planned genre: ${planEntry.genre}.` : '') + '\n' +
        'Return JSON with:\n' +
        '- "lyrics": EVERY sung line in order, as [{"start": seconds, "end": seconds, "text": "exact words"}]. ' +
        'Timestamps must match when the line is actually sung (precise to ~0.3 s). Split long lines so each has max 8 words. Empty array if instrumental.\n' +
        '- "chorus": {"start": seconds, "end": seconds} of the FIRST full chorus / hook (the catchiest, most energetic repeated part).\n' +
        '- "genre": short genre name; "mood": 1-3 words; "language": main language of the lyrics.\n' +
        '- "title": a short catchy song title (use the planned one if given).\n' +
        '- "bestLine": the single most catchy/relatable lyric line from the chorus, max 8 words, exactly as sung.\n' +
        '- "coverPrompt": a vivid visual scene (no people\'s faces close-up, no text) that matches the song\'s mood, for an album cover, 20-35 words.\n' +
        '- "instrumental": true ONLY if the song has no sung words at all.\n' +
        'Return ONE flat JSON object with exactly these keys.',
      images: [{ label: 'SONG AUDIO', b64: fs.readFileSync(small).toString('base64'), mime: 'audio/mpeg' }],
      // Lirika bo'sh kelsa (zaif model yoki noto'g'ri format) — keyingi model sinaladi
      accept: (raw) => {
        const j = unwrap(raw);
        if (j.instrumental === true) return true;
        const n = Array.isArray(j.lyrics) ? j.lyrics.filter((l) => l && l.text).length : 0;
        return n >= 4 ? true : `lirika ${n} qator`;
      },
    });
    r = unwrap(r);
    if (r.instrumental !== true && !(Array.isArray(r.lyrics) && r.lyrics.length >= 4)) {
      throw new Error('Gemini lirikani aniqlay olmadi — keyinroq qayta urinaman');
    }
  }

  // Tekshirish va tozalash: vaqtlar ketma-ket, qo'shiq ichida, bo'sh qatorlarsiz
  let lyrics = (Array.isArray(r.lyrics) ? r.lyrics : [])
    .map((l) => ({ start: Number(l.start), end: Number(l.end), text: cleanText(l.text) }))
    .filter((l) => l.text && Number.isFinite(l.start) && l.start >= 0 && l.start < dur)
    .sort((a, b) => a.start - b.start);
  lyrics = lyrics.map((l, i) => {
    const next = lyrics[i + 1]?.start ?? dur;
    // bitta qator ko'pi bilan 7 soniya ekranda turadi (Gemini ba'zan qo'shiq oxirigacha cho'zib yuboradi)
    const end = Number.isFinite(l.end) && l.end > l.start ? Math.min(l.end, next, dur, l.start + 7) : Math.min(l.start + 3.5, next, dur);
    return { ...l, end: Math.max(end, l.start + 0.6) };
  });

  let chorus = r.chorus && Number.isFinite(Number(r.chorus.start)) ? { start: Number(r.chorus.start), end: Number(r.chorus.end) } : null;
  if (chorus && (chorus.start < 0 || chorus.start > dur - 10)) chorus = null;
  if (!chorus) {
    const start = await loudestWindow(audioFile, runDir, dur, 35);
    chorus = { start, end: start + 35, fallback: true };
    log(`   ↪️  Naqarot aniqlanmadi — eng baland joy olindi: ${start.toFixed(1)}s`);
  }

  const result = {
    duration: dur,
    title: cleanText(planEntry?.title || r.title || path.parse(audioFile).name),
    genre: cleanText(planEntry?.genre || r.genre || 'pop'),
    mood: cleanText(r.mood || ''),
    language: cleanText(r.language || 'English'),
    bestLine: cleanText(r.bestLine || lyrics.find((l) => l.start >= chorus.start)?.text || ''),
    coverPrompt: cleanText(r.coverPrompt || `${r.mood || 'moody'} atmospheric night scene`),
    chorus,
    lyrics,
  };
  writeJson(out, result);
  fs.rmSync(small, { force: true });
  log(`   ✅ ${lyrics.length} ta lirika qatori, naqarot ${chorus.start.toFixed(1)}–${chorus.end.toFixed(1)}s, janr: ${result.genre}`);
  log(`   💬 Eng kuchli qator: "${result.bestLine}"`);
  return result;
}

// Gemini ba'zan javobni massiv yoki {"song": {...}} ichiga o'raydi — ochib olamiz
function unwrap(r) {
  if (Array.isArray(r)) r = r.find((x) => x && typeof x === 'object') || {};
  if (r && typeof r === 'object' && !('lyrics' in r)) {
    const inner = Object.values(r).find((v) => v && typeof v === 'object' && !Array.isArray(v) && 'lyrics' in v);
    if (inner) return inner;
  }
  return r || {};
}

// Eng baland (energiyali) N soniyalik joy — har soniyaning ovoz balandligi o'lchanadi
async function loudestWindow(audioFile, runDir, dur, len) {
  const stats = path.join(runDir, 'rms.txt');
  await ffmpeg(['-i', audioFile, '-af',
    `aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=${stats}`,
    '-f', 'null', '-']);
  const rms = fs.readFileSync(stats, 'utf8').split('\n').filter((l) => l.includes('RMS_level='))
    .map((l) => { const v = parseFloat(l.split('=')[1]); return Number.isFinite(v) ? v : -90; });
  fs.rmSync(stats, { force: true });
  if (rms.length <= len) return 0;
  let best = 0;
  let bestSum = -Infinity;
  for (let s = 5; s + len < Math.min(rms.length, dur); s++) {
    const sum = rms.slice(s, s + len).reduce((a, b) => a + b, 0);
    if (sum > bestSum) { bestSum = sum; best = s; }
  }
  return best;
}

function mockListen(dur) {
  const lines = ['Rain is falling on my window', 'I keep waiting for your call', 'Every night the city whispers',
    'You were never mine at all', 'Hold me close, the night is young', 'Sing it loud, our song is sung'];
  return {
    title: 'Mock Song', genre: 'lofi hip-hop', mood: 'rainy, calm', language: 'English', bestLine: 'You were never mine at all',
    coverPrompt: 'rainy window at night with city lights blurred, warm lamp, cozy room',
    chorus: { start: 8, end: 38 },
    lyrics: Array.from({ length: Math.floor(dur / 3.2) }, (_, i) => ({ start: 1 + i * 3.2, end: 1 + i * 3.2 + 2.8, text: lines[i % lines.length] })),
  };
}
