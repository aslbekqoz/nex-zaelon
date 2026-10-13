// AGENT 1: Tinglovchi — qo'shiqni Gemini'ga "eshittiradi".
// Natija (listen.json): lirika qatorlari va ularning vaqti, naqarot qayerda, janr, kayfiyat,
// eng "ilinadigan" qator (sarlavha uchun) va muqova g'oyasi.
// Gemini naqarotni topa olmasa — eng baland 35 soniyalik joy olinadi (zaxira usul).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { askJson } from '../lib/gemini.js';
import { ffmpeg, duration } from '../lib/ffmpeg.js';
import { log } from '../lib/log.js';
import { writeJson } from '../lib/util.js';

// "o'" uchun turli apostroflarni bitta oddiy belgiga keltiramiz (shriftda bor bo'lishi uchun)
const cleanText = (t) => String(t || '').replace(/[ʻʼ‘’`´]/g, "'").replace(/\s+/g, ' ').trim();

export async function runListen(audioFile, runDir, planEntry, fileTitle = '') {
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

  // Vaqtlarni Whisper bilan aniqlash (naqarot atrofida — videoga aynan shu qism kiradi)
  const sync = await syncLyrics(audioFile, runDir, lyrics, chorus, dur, r.language);
  ({ lyrics, chorus } = sync);
  // Vaqti tasdiqlanmagan lirika ekranga chiqmaydi: noto'g'ri subtitr — lirikasiz videodan yomonroq
  let lyricsHidden = false;
  if (sync.ok === false) {
    lyricsHidden = true;
    lyrics = [];
    log('   ⚠️  Lirika vaqtini tasdiqlab bo\'lmadi — video LIRIKASIZ chiqadi (noto\'g\'ri subtitr bo\'lmasin)');
  }

  const result = {
    duration: dur,
    title: cleanText(planEntry?.title || fileTitle || r.title || 'Untitled'),
    genre: cleanText(planEntry?.genre || r.genre || 'pop'),
    mood: cleanText(r.mood || ''),
    language: cleanText(r.language || 'English'),
    bestLine: cleanText(r.bestLine || lyrics.find((l) => l.start >= chorus.start)?.text || ''),
    coverPrompt: cleanText(r.coverPrompt || `${r.mood || 'moody'} atmospheric night scene`),
    chorus,
    lyrics,
    lyricsHidden,
  };
  writeJson(out, result);
  fs.rmSync(small, { force: true });
  log(`   ✅ ${lyrics.length} ta lirika qatori, naqarot ${chorus.start.toFixed(1)}–${chorus.end.toFixed(1)}s, janr: ${result.genre}`);
  log(`   💬 Eng kuchli qator: "${result.bestLine}"`);
  return result;
}

// ---------- Sinxronlash (Whisper) ----------
// Gemini qatorlari matnini saqlab, vaqtini Whisper eshitgan so'zlarga moslaydi. Python/faster-whisper
// o'rnatilmagan bo'lsa (masalan laptopda) — jim o'tkazib yuboriladi, Gemini vaqtlari qoladi.
const ALIGN = path.join(path.dirname(fileURLToPath(import.meta.url)), 'align.py');
function py(args, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn(process.env.NEX_PYTHON || 'python3', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    p.on('error', (e) => { clearTimeout(t); resolve({ ok: false, err: e.message }); });
    p.on('close', (code) => { clearTimeout(t); resolve({ ok: code === 0, err: err.slice(-300) }); });
  });
}

const tidy = (lyrics, dur) => lyrics.sort((a, b) => a.start - b.start).map((l, i, arr) => {
  const next = arr[i + 1]?.start ?? dur;
  const end = Math.min(l.end > l.start ? l.end : l.start + 3.5, next, dur, l.start + 7);
  return { ...l, start: +l.start.toFixed(2), end: +Math.max(end, l.start + 0.6).toFixed(2) };
});

export async function syncLyrics(audioFile, runDir, lyrics, chorus, dur, language) {
  if (config.mock || process.env.NEX_ALIGN === '0' || !lyrics.length) return { lyrics, chorus, ok: null };
  const ws = Math.max(0, chorus.start - 4);
  const we = Math.min(dur, chorus.start + 52);
  const inside = lyrics.filter((l) => l.start < we && l.end > ws);
  if (!inside.length) return { lyrics, chorus, ok: null };
  const wav = path.join(runDir, 'sync.wav');
  const job = path.join(runDir, 'sync-job.json');
  const res = path.join(runDir, 'sync.json');
  await ffmpeg(['-ss', ws.toFixed(2), '-t', (we - ws).toFixed(2), '-i', audioFile, '-ac', '1', '-ar', '16000', wav]);
  fs.writeFileSync(job, JSON.stringify({ audio: wav, offset: ws, language, model: process.env.NEX_WHISPER_MODEL || 'small', lines: inside }));
  const t0 = Date.now();
  const r = await py([ALIGN, job, res], 8 * 60_000);
  fs.rmSync(wav, { force: true });
  if (!r.ok || !fs.existsSync(res)) {
    const why = (r.err || 'whisper yo\'q').split('\n').filter(Boolean).pop()?.slice(0, 90);
    log(`   ↪️  Sinxronlash o'tkazib yuborildi (${why})`);
    // Whisper o'rnatilmagan (laptop) -> Gemini vaqtlari qoladi; boshqa xato -> ishonchsiz
    return { lyrics, chorus, ok: /ENOENT|ModuleNotFoundError|No module/.test(r.err || '') ? null : false };
  }
  const a = JSON.parse(fs.readFileSync(res, 'utf8'));
  // Whisper musiqada ba'zan "so'z to'qiydi" (bir zumda bir nechta so'z) — buni haqiqiy ovoz deb hisoblamaymiz
  if (!a.lines?.length || a.words < 6 || (a.span ?? 99) < 4 || (a.mode === 'whisper' && a.words < 10)) {
    log('   ↪️  Whisper ovozni deyarli eshitmadi');
    return { lyrics, chorus, ok: false };
  }
  const aligned = a.lines.map((l) => ({ start: Number(l.start), end: Number(l.end), text: cleanText(l.text) }))
    .filter((l) => l.text && Number.isFinite(l.start) && Number.isFinite(l.end));
  const outside = lyrics.filter((l) => !(l.start < we && l.end > ws));
  const moved = inside.length ? inside.reduce((s, l, i) => s + Math.abs(l.start - (aligned[i]?.start ?? l.start)), 0) / inside.length : 0;
  const next = tidy([...outside, ...aligned], dur);
  // naqarot boshini haqiqiy qator boshiga to'g'rilaymiz (klip qator o'rtasidan boshlanmasin)
  // Gemini naqarotning birinchi qatori deb bilgan qatorni topib, uning YANGI vaqtini olamiz
  const gi = inside.findIndex((l) => l.start >= chorus.start - 0.8);
  const first = a.mode === 'aligned' && gi >= 0 && aligned.length === inside.length ? aligned[gi]
    : aligned.find((l) => l.start >= chorus.start - 2.5);
  const newChorus = first ? { ...chorus, start: first.start, end: Math.max(chorus.end, first.start + 25) } : chorus;
  log(`   🎯 Sinxronlash (${a.mode === 'whisper' ? 'Whisper matni' : 'Gemini matni + Whisper vaqti'}): ${aligned.length} qator, ` +
    `mos ${(a.ratio * 100).toFixed(0)}%, o'rtacha siljish ${moved.toFixed(1)}s, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return { lyrics: next, chorus: newChorus, ok: a.mode === 'whisper' || a.ratio >= 0.4, ratio: a.ratio };
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
