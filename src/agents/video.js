// 3-AGENT: Video yaratuvchi
//  1) Ovoz — har sahna alohida, har bir so'z vaqti bilan
//  2) Qahramon — bitta "namuna" rasm; keyingi rasmlar unga qarab chiziladi (hamma joyda bir xil ko'rinish)
//  3) Rasmlar — vertikal 9:16, butun ekran; 5 soniyadan uzun sahna 2 ta rasmga bo'linadi
//  4) Montaj — har rasmda harakat (zoom/pan), sahnalar orasida silliq o'tish, karaoke subtitr,
//     boshida katta HOOK sarlavha, o'tishlarda "whoosh" ovoz effekti, musiqa
//  5) Thumbnail
// Natija: video.mp4, thumbnail.jpg
import fs from 'node:fs';
import path from 'node:path';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { config, ROOT } from '../config.js';
import { log } from '../lib/log.js';
import { ffmpeg, duration } from '../lib/ffmpeg.js';
import { readJson, writeJson, exists, retry } from '../lib/util.js';
import { qualityCheck } from './qa.js';

// O'lchamlar formatga qarab o'rnatiladi (runVideo boshida): Shorts 9:16 yoki uzun video 16:9
const FORMATS = {
  short: { W: 1080, H: 1920, IMG_W: 768, IMG_H: 1344, SPLIT_OVER: 5.0, SUB: [128, 480], HOOK: [170, 330], THUMB: [1080, 1920], MUSIC: 0.25 },
  long: { W: 1920, H: 1080, IMG_W: 1344, IMG_H: 768, SPLIT_OVER: 9.0, SUB: [86, 70], HOOK: [120, 60], THUMB: [1280, 720], MUSIC: 0.18 },
};
let F = FORMATS.short;
let W = F.W;
let H = F.H;
let IMG_W = F.IMG_W; // AI rasm o'lchami, keyin W x H ga kattalashtiriladi
let IMG_H = F.IMG_H;
let SPLIT_OVER = F.SPLIT_OVER; // shundan uzun sahna 2 ta rasmga bo'linadi
const FPS = 30;
const PAD = 0.2; // har sahna oxiridagi kichik pauza (soniya)
const T = 0.35; // sahnalar orasidagi o'tish davomiyligi
const FONT = 'Anton';
const FONTS_DIR = path.join(ROOT, 'fonts');
const IMG_PARALLEL = 3; // bir vaqtda nechta rasm so'raladi
const TRANSITIONS = ['fade', 'smoothleft', 'zoomin', 'smoothup', 'circleopen', 'slideleft'];

export async function runVideo(runDir) {
  const script = readJson(path.join(runDir, 'script.json'));
  F = FORMATS[script.format === 'long' ? 'long' : 'short'];
  ({ W, H, IMG_W, IMG_H, SPLIT_OVER } = F);
  // eski ssenariylarda seed yo'q — mavzudan doimiy son yasaymiz
  script.seed = script.seed || [...script.topic].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2_000_000_000, 7) + 1;
  const scenesDir = path.join(runDir, 'scenes');
  fs.mkdirSync(scenesDir, { recursive: true });

  // ---------- 1) OVOZ ----------
  log(`🎙️  Ovoz: ${script.scenes.length} ta sahna`);
  const timeline = [];
  let t = 0;
  for (const sc of script.scenes) {
    const dir = path.join(scenesDir, String(sc.scene));
    fs.mkdirSync(dir, { recursive: true });
    const audio = path.join(dir, 'audio.mp3');
    if (!exists(audio)) await retry(`Ovoz ${sc.scene}`, () => tts(sc.narration, dir), { waits: [10_000, 30_000] });
    const dur = (await duration(audio)) + PAD;
    const words = readWords(dir, sc.narration, dur - PAD).map((w) => ({ ...w, start: w.start + t, end: w.end + t }));
    timeline.push({ scene: sc.scene, start: t, dur, words });
    t += dur;
  }
  writeJson(path.join(runDir, 'timeline.json'), timeline);
  log(`   ✅ Davomiylik: ${t.toFixed(1)} soniya`);
  if (script.format !== 'long' && t > 59) log('   ⚠️  59 soniyadan uzun — Shorts uchun SCRIPT_WORDS ni kamaytiring');

  // ---------- 2) VIDEO BO'LAKLARI (uzun sahna -> 2 rasm) ----------
  const segs = [];
  for (const seg of timeline) {
    const sc = script.scenes.find((s) => s.scene === seg.scene);
    const base = { scene: seg.scene, useCharacter: sc.useCharacter !== false };
    if (seg.dur > SPLIT_OVER) {
      const half = seg.dur / 2;
      segs.push({ ...base, id: `${seg.scene}a`, start: seg.start, dur: half, visual: sc.visual });
      segs.push({ ...base, id: `${seg.scene}b`, start: seg.start + half, dur: seg.dur - half,
        visual: `${sc.visual} — a different camera angle: dynamic close-up on the most important detail` });
    } else {
      segs.push({ ...base, id: `${seg.scene}`, start: seg.start, dur: seg.dur, visual: sc.visual });
    }
  }

  // ---------- 3) QAHRAMON + RASMLAR ----------
  const imgDir = path.join(runDir, 'images');
  fs.mkdirSync(imgDir, { recursive: true });
  // Qahramon bir xilligi: asosiy usul — har bir so'rovda bir xil qahramon matni + bir xil "seed".
  // Namuna-rasm usuli (CHARACTER_REF=1) ixtiyoriy: u filtrga tez-tez tushgani uchun sukut bo'yicha o'chiq.
  const charRef = path.join(imgDir, 'character_ref.png');
  if (!config.mock && config.characterRef && script.character && segs.some((s) => s.useCharacter) && !exists(charRef)) {
    log('🦥 Qahramon namunasi chizilyapti');
    const sheet = path.join(imgDir, 'character.jpg');
    await retry('Qahramon', () => makeImage({
      prompt: `Cute animal mascot character design: ${script.character}. Natural animal anatomy, body fully covered in thick fur, ` +
        `wearing a small bright green scarf, sitting on a tree branch, friendly smile, single character, plain light background, ` +
        `family-friendly children's cartoon, ${script.style}`,
      out: sheet, width: 512, height: 512,
    }), { waits: [5_000, 15_000] });
    await ffmpeg(['-i', sheet, '-vf', 'scale=480:480', charRef]); // namuna 512x512 dan kichik bo'lishi shart
  }

  const todo = segs.map((s, i) => ({ s, i })).filter(({ s }) => {
    s.file = path.join(imgDir, `${s.id}.jpg`);
    return !exists(s.file);
  });
  log(`🖼️  Rasmlar: ${segs.length} ta (${todo.length} tasi chiziladi, bir vaqtda ${IMG_PARALLEL} tadan)`);
  let done = segs.length - todo.length;
  await pool(todo, IMG_PARALLEL, async ({ s, i }) => {
    const withChar = s.useCharacter && exists(charRef);
    const used = await retry(`Rasm ${s.id}`, () => imageWithSafeFallback({ visual: s.visual, script, out: s.file, ref: withChar ? charRef : null, n: i }),
      { waits: [5_000, 15_000] });
    done++;
    log(`   ✅ Rasm ${done}/${segs.length} (${s.id})${used.model ? ` [${used.model}]` : ''}${used.note ? ` — ${used.note}` : ''}`);
  });

  // ---------- 3b) SIFAT NAZORATI (art-direktor agent) ----------
  if (!config.mock && !exists(path.join(runDir, 'qa.json'))) {
    await qualityCheck(runDir, script, segs, async (s, visual) => {
      const tmp = path.join(imgDir, `redo_${s.id}.jpg`);
      const withChar = s.useCharacter && exists(charRef);
      // boshqa seed — aks holda model xuddi o'sha rasmni qayta chizishi mumkin
      await imageWithSafeFallback({ visual, script: { ...script, seed: script.seed + 7919 }, out: tmp, ref: withChar ? charRef : null, n: 0 });
      fs.renameSync(tmp, s.file);
      fs.rmSync(path.join(runDir, 'clips', `${s.id}.mp4`), { force: true }); // eski klip bo'lsa — qayta yasalsin
    });
  }

  // ---------- 4) MONTAJ ----------
  log('🎬 Montaj: harakat va o\'tishlar');
  const clipsDir = path.join(runDir, 'clips');
  fs.mkdirSync(clipsDir, { recursive: true });
  for (const [i, s] of segs.entries()) {
    s.len = s.dur + (i < segs.length - 1 ? T : 0); // keyingi sahnaga o'tish uchun ozgina ortiqcha
    s.clip = path.join(clipsDir, `${s.id}.mp4`);
    if (!exists(s.clip)) await makeClip(s.file, s.clip, s.len, i);
  }
  await joinWithTransitions(runDir, segs);

  // Ovoz: sahnalar ovozini ketma-ket ulaymiz (har biri aniq o'z davomiyligida)
  const parts = [];
  for (const seg of timeline) {
    const out = path.join(scenesDir, String(seg.scene), 'audio_pad.wav');
    await ffmpeg(['-i', path.join(scenesDir, String(seg.scene), 'audio.mp3'), '-af', 'apad', '-t', seg.dur.toFixed(3), '-ar', '44100', '-ac', '2', out]);
    parts.push(out);
  }
  fs.writeFileSync(path.join(runDir, 'audio_concat.txt'), parts.map((p) => `file '${p}'`).join('\n'));
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', 'audio_concat.txt', '-c', 'copy', 'voice.wav'], { cwd: runDir });

  // Shorts: boshida katta hook sarlavha. Uzun video: har bob boshida "#7: ..." sarlavhasi
  const hookText = script.format === 'long' ? '' : (script.onScreenHook || (script.hook.split(/\s+/).length <= 6 ? script.hook : ''));
  const overlays = (script.chapters || []).map((c) => {
    const seg = timeline.find((x) => x.scene === c.scene);
    return seg ? { start: seg.start, end: seg.start + Math.min(3.5, seg.dur + 1), text: c.title } : null;
  }).filter(Boolean);
  fs.writeFileSync(path.join(runDir, 'subs.ass'), buildAss(timeline, hookText, overlays));

  // Ovoz qatlamlari: diktor + (musiqa, diktor gapirganda pasayadi) + ovoz effektlari
  const music = pickMusic();
  const sfx = await ensureSfx();
  const args = ['-i', 'joined.mp4', '-i', 'voice.wav'];
  const AF = 'aformat=sample_rates=44100:channel_layouts=stereo';
  let idx = 2;
  const parts2 = [`[1:a]${AF},asplit=2[vo][sc]`];
  const mix = ['[vo]'];
  if (music) {
    args.push('-stream_loop', '-1', '-i', music);
    parts2.push(`[${idx++}:a]${AF},volume=${F.MUSIC}[m]`, '[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[md]');
    mix.push('[md]');
    log(`   🎵 Fon musiqasi: ${path.basename(music)}`);
  } else {
    parts2.push('[sc]anullsink');
    log('   🎵 Musiqa yo\'q (music/ papkasiga mp3 qo\'ysangiz, avtomatik qo\'shiladi)');
  }
  if (sfx) {
    // "whoosh" — faqat yangi sahnaga o'tishda (bir sahnaning 2-rasmiga o'tishda emas), o'tish o'rtasiga to'g'rilab
    // Uzun videoda har sahnada emas, faqat yangi bob (#N) boshlanishida — aks holda charchatadi
    const chapterScenes = new Set((script.chapters || []).map((c) => c.scene));
    const times = segs.slice(1).filter((s) => !s.id.endsWith('b') && (script.format !== 'long' || chapterScenes.has(s.scene)))
      .map((s) => Math.max(0, s.start + T / 2 - 0.22));
    if (times.length) {
      args.push('-i', sfx.whoosh);
      const w = idx++;
      parts2.push(`[${w}:a]${AF},volume=0.35,asplit=${times.length}${times.map((_, k) => `[w${k}]`).join('')}`);
      times.forEach((tm, k) => { const ms = Math.round(tm * 1000); parts2.push(`[w${k}]adelay=${ms}|${ms}[wd${k}]`); mix.push(`[wd${k}]`); });
    }
    if (hookText) {
      args.push('-i', sfx.ding); // hook sarlavhasi chiqqanda "ding"
      parts2.push(`[${idx++}:a]${AF},volume=0.45,adelay=60|60[dg]`);
      mix.push('[dg]');
    }
    log(`   🔊 Ovoz effektlari: ${times.length} ta whoosh${hookText ? ' + ding' : ''}`);
  }
  parts2.push(`${mix.join('')}amix=inputs=${mix.length}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  await ffmpeg([...args, '-filter_complex', `[0:v]ass=subs.ass:fontsdir=${FONTS_DIR}[v];${parts2.join(';')}`, '-map', '[v]', '-map', '[a]',
    '-t', t.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', 'video.mp4'], { cwd: runDir });

  // ---------- 5) THUMBNAIL ----------
  await makeThumbnail(runDir, segs[0].file, script.onScreenHook || script.hook);
  log('   ✅ video.mp4 va thumbnail.jpg tayyor');
}

// Bir vaqtda `n` tadan vazifa bajaradigan oddiy navbat
async function pool(items, n, fn) {
  let next = 0;
  let firstErr = null;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length && !firstErr) {
      const item = items[next++];
      try { await fn(item); } catch (err) { firstErr = firstErr || err; }
    }
  }));
  if (firstErr) throw firstErr;
}

// ================= OVOZ =================
async function tts(text, dir) {
  if (config.mock && process.env.MOCK_TTS === 'silent') return silentAudio(text, dir);
  try {
    const t = new MsEdgeTTS();
    await t.setMetadata(config.ttsVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    await t.toFile(dir, text); // dir/audio.mp3 + dir/metadata.json
    t.close();
  } catch (err) {
    if (config.mock) return silentAudio(text, dir);
    throw err;
  }
}

async function silentAudio(text, dir) {
  const secs = Math.max(1.5, text.split(/\s+/).length / 2.6);
  await ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', secs.toFixed(2), '-q:a', '4', path.join(dir, 'audio.mp3')]);
}

function readWords(dir, text, dur) {
  const meta = path.join(dir, 'metadata.json');
  if (exists(meta)) {
    const items = readJson(meta).Metadata.filter((m) => m.Type === 'WordBoundary');
    if (items.length) return items.map((m) => ({ text: m.Data.text.Text, start: m.Data.Offset / 1e7, end: (m.Data.Offset + m.Data.Duration) / 1e7 }));
  }
  const words = text.split(/\s+/);
  return words.map((w, i) => ({ text: w, start: (i * dur) / words.length, end: ((i + 1) * dur) / words.length }));
}

// ================= RASM =================
// Xavfsizlik filtri ba'zan begunoh so'zlarga ham ishlaydi ("dies", "blood"...).
// Shunday bo'lsa: 1) yumshatilgan so'zlar bilan, 2) oddiy xavfsiz sahna bilan qayta chizamiz.
const SOFTEN = [
  [/\b(dies|died|dead|death|dying|corpse|carcass)\b/gi, 'sleeping peacefully'],
  [/\b(kill(s|ed|ing)?|hunt(s|ed|ing)?|attack(s|ed|ing)?|prey)\b/gi, 'chasing playfully'],
  [/\b(blood|bloody|gore|wound(s|ed)?|injur(y|ies|ed))\b/gi, 'glowing light'],
  [/\b(stomach contents|digest(s|ed|ion|ing)?|poop(s|ing)?|feces|dung|urine)\b/gi, 'big round belly full of leaves'],
  [/\b(mating|mate(s|d)?|sex(ual)?|naked|nude|breed(s|ing)?)\b/gi, 'family together'],
  [/\b(skeleton|skull|bones?)\b/gi, 'fossil museum display'],
];
const soften = (t) => SOFTEN.reduce((acc, [re, rep]) => acc.replace(re, rep), t);
const isSafetyFlag = (err) => /flagged|nsfw|safety|unsafe/i.test(err.message);

// Rasm "flagged" bo'lsa — sababi so'rovdagi so'z ham, namuna rasm ham bo'lishi mumkin.
// Shuning uchun bosqichma-bosqich: namunasiz -> yumshatilgan -> oddiy sahna.
// Namuna 2 marta muammo chiqarsa — qolgan sahnalarda ishlatilmaydi.
let refFlags = 0;

async function imageWithSafeFallback({ visual, script, out, ref, n }) {
  const style = `Style: ${script.style}, family-friendly children's cartoon, cheerful`;
  const charPart = 'The main character from image 0 — keep EXACTLY the same design, colors, face, scarf and proportions.';
  const charText = script.character ? `Main character: ${script.character}, wearing a small bright green scarf.` : '';
  const useRef = ref && refFlags < 2;
  const variants = [
    ...(useRef ? [{ prompt: `${charPart} Scene: ${visual}. ${style}`, ref, note: '' }] : []),
    { prompt: `${visual}. ${charText} ${style}`, ref: null, note: useRef ? 'namunasiz' : '' },
    { prompt: `${soften(visual)}. ${charText} ${style}`, ref: null, note: 'yumshatilgan so\'zlar bilan' },
    { prompt: `${charText} Smiling happily in its natural habitat (${script.topic}). ${style}`, ref: null, note: 'oddiy xavfsiz sahna' },
  ];
  let lastErr;
  for (const [k, v] of variants.entries()) {
    try {
      const r = await makeImage({ prompt: v.prompt, out, width: IMG_W, height: IMG_H, ref: v.ref, n, seed: script.seed });
      return { ref: r.ref, model: r.model, note: v.note };
    } catch (err) {
      if (!isSafetyFlag(err)) throw err;
      lastErr = err;
      if (v.ref) {
        refFlags++;
        if (refFlags === 2) log('   🛡️  Qahramon namunasi filtrga tushyapti — qolgan rasmlar namunasiz chiziladi');
      }
      if (k < variants.length - 1) log(`   🛡️  Filtr rad etdi — boshqacha variantda qayta chizaman (${k + 2}/${variants.length})`);
    }
  }
  // Hech biri o'tmadi: butun videoni to'xtatmaymiz — oldingi rasmni takrorlaymiz
  const prev = fs.readdirSync(path.dirname(out)).filter((f) => /^\d+[ab]?\.jpg$/.test(f)).sort().pop();
  if (prev) {
    fs.copyFileSync(path.join(path.dirname(out), prev), out);
    return { ref: false, model: '', note: `filtr o'tkazmadi, oldingi rasm (${prev}) takrorlandi` };
  }
  throw lastErr;
}

// Bitta rasm: avval FLUX.2 klein (vertikal). Sekin qolsa / server xatosi bo'lsa — FAQAT shu rasm uchun
// zaxira modelga (FLUX.1 schnell) o'tamiz. Xavfsizlik filtri xatosi yuqoriga qaytadi (so'rov o'zgartiriladi).
async function makeImage({ prompt, out, width, height, ref = null, n = 0, seed }) {
  if (config.mock) { await mockImage(out, n); return { ref: Boolean(ref), model: 'mock' }; }
  if (!config.cfAccountId || !config.cfToken) throw new Error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN .env da yo\'q');
  if (config.imageModel === 'flux-2-klein-4b') {
    try {
      await kleinImage({ prompt, out, width, height, ref, seed });
      return { ref: Boolean(ref), model: 'klein' };
    } catch (err) {
      // Xavfsizlik filtri yoki dasturdagi xato (TypeError va h.k.) — zaxira model bilan yashirmaymiz
      if (isSafetyFlag(err) || err instanceof TypeError || err instanceof ReferenceError) throw err;
      log(`   ↪️  klein: ${err.message.slice(0, 80)} — bu rasm zaxira model bilan chiziladi`);
    }
  }
  await schnellImage({ prompt: prompt.replace(/^The main character from image 0[^.]*\.\s*/, ''), out });
  return { ref: false, model: 'schnell' };
}

const cfUrl = (model) => `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/ai/run/@cf/black-forest-labs/${model}`;

async function cfFetch(url, opts, ms) {
  try {
    return await fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });
  } catch (err) {
    throw new Error(err.name === 'TimeoutError' ? `${ms / 1000} soniyada javob kelmadi` : `tarmoq xatosi (${err.cause?.code || err.message})`);
  }
}

async function cfResult(res) {
  const data = await res.json().catch(() => ({}));
  const b64 = data?.result?.image || data?.image;
  if (!res.ok || !b64) {
    const msg = data.errors?.[0]?.message || JSON.stringify(data).slice(0, 150);
    const err = new Error(`Cloudflare rasm xatosi: HTTP ${res.status}: ${msg}`);
    // so'rov noto'g'ri yoki kunlik bepul limit tugagan — hozir qayta urinish befoyda
    err.fatal = [400, 401, 403, 404].includes(res.status) || /4006|daily free allocation/i.test(JSON.stringify(data));
    throw err;
  }
  return Buffer.from(b64, 'base64');
}

// FLUX.2 klein: vertikal o'lcham + qahramon namunasi (multipart forma)
async function kleinImage({ prompt, out, width, height, ref, seed }) {
  const form = new FormData();
  form.append('prompt', prompt.slice(0, 2000));
  form.append('width', String(width));
  form.append('height', String(height));
  if (seed) form.append('seed', String(seed));
  if (ref) form.append('input_image_0', new Blob([fs.readFileSync(ref)], { type: 'image/png' }), 'ref.png');
  const res = await cfFetch(cfUrl('flux-2-klein-4b'), {
    method: 'POST', headers: { Authorization: `Bearer ${config.cfToken}` }, body: form,
  }, 45_000);
  fs.writeFileSync(out, await cfResult(res));
}

// Zaxira: FLUX.1 schnell (faqat kvadrat rasm, namuna qabul qilmaydi)
async function schnellImage({ prompt, out }) {
  const res = await cfFetch(cfUrl('flux-1-schnell'), {
    method: 'POST', headers: { Authorization: `Bearer ${config.cfToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6 }),
  }, 60_000);
  fs.writeFileSync(out, await cfResult(res));
}

async function mockImage(outFile, n) {
  const colors = ['0x3b82f6', '0xf97316', '0x10b981', '0xa855f7', '0xef4444', '0x14b8a6', '0xeab308', '0xec4899'];
  await ffmpeg(['-f', 'lavfi', '-i', `color=c=${colors[n % colors.length]}:s=${IMG_W}x${IMG_H}`, '-f', 'lavfi', '-i', 'color=c=white@0.85:s=360x360',
    '-filter_complex', '[0][1]overlay=(W-w)/2:(H-h)/2', '-frames:v', '1', outFile]);
}

// ================= KLIP: butun ekran + harakat =================
async function makeClip(image, out, len, i) {
  const frames = Math.max(2, Math.round(len * FPS));
  const N = frames;
  const SW = Math.round(W * 1.5); // kattaroq o'lchamda ishlaymiz — harakat silliq chiqishi uchun
  const SH = Math.round(H * 1.5);
  const motions = [
    { z: `1+0.12*on/${N}`, x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' }, // yaqinlashish
    { z: '1.12', x: 'iw/2-(iw/zoom/2)', y: `(ih-ih/zoom)*(1-on/${N})` }, // pastdan yuqoriga
    { z: `1.12-0.12*on/${N}`, x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' }, // uzoqlashish
    { z: '1.12', x: `(iw-iw/zoom)*on/${N}`, y: 'ih/2-(ih/zoom/2)' }, // chapdan o'ngga
  ];
  const m = motions[i % motions.length];
  await ffmpeg(['-i', image, '-filter_complex',
    `[0]scale=${SW}:${SH}:force_original_aspect_ratio=increase,crop=${SW}:${SH},setsar=1,` +
    `zoompan=z='${m.z}':x='${m.x}':y='${m.y}':d=${frames}:s=${W}x${H}:fps=${FPS},format=yuv420p[v]`,
    '-map', '[v]', '-frames:v', String(frames), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', out]);
}

// Klip'larni silliq o'tishlar (xfade) bilan ulash.
// Ko'p klip (uzun video) bir vaqtda ochilsa xotira yetmaydi — 10 tadan guruhlab ulaymiz, keyin guruhlarni ulaymiz.
// Har bir element: { clip, start } — start = shu klip yakuniy videoda boshlanadigan vaqt.
async function joinWithTransitions(runDir, segs, outName = 'joined.mp4') {
  const GROUP = 10;
  if (segs.length > GROUP + 2) {
    const groups = [];
    for (let g = 0; g * GROUP < segs.length; g++) {
      const part = segs.slice(g * GROUP, (g + 1) * GROUP);
      const base = part[0].start;
      const name = `joined_part${g}.mp4`;
      await joinWithTransitions(runDir, part.map((x) => ({ ...x, start: x.start - base })), name);
      groups.push({ clip: path.join(runDir, name), start: base });
    }
    await joinWithTransitions(runDir, groups, outName);
    for (const g of groups) fs.rmSync(g.clip, { force: true });
    return;
  }
  if (segs.length === 1) {
    fs.copyFileSync(segs[0].clip, path.join(runDir, outName));
    return;
  }
  const inputs = segs.flatMap((s) => ['-i', s.clip]);
  let filter = '';
  let prev = '[0:v]';
  for (let k = 1; k < segs.length; k++) {
    const outLabel = k === segs.length - 1 ? '[v]' : `[x${k}]`;
    const tr = TRANSITIONS[(k - 1) % TRANSITIONS.length];
    filter += `${prev}[${k}:v]xfade=transition=${tr}:duration=${T}:offset=${segs[k].start.toFixed(3)}${outLabel};`;
    prev = outLabel;
  }
  await ffmpeg([...inputs, '-filter_complex', filter.replace(/;$/, ''), '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast',
    '-crf', '17', '-pix_fmt', 'yuv420p', outName], { cwd: runDir });
}

// ================= SUBTITR: karaoke uslubi =================
const assTime = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${sec}`;
};
const assEsc = (s) => s.replace(/[{}\\]/g, '');

function assHeader(size, marginV) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,${FONT},${size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,8,4,2,70,70,${marginV},1
Style: Hook,${FONT},${F.HOOK[0]},&H0000E5FF,&H0000E5FF,&H00000000,&H96000000,0,0,0,0,100,100,2,0,1,11,6,8,80,80,${F.HOOK[1]},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

const HIGHLIGHT = '{\\c&H00E5FF&\\fscx115\\fscy115}'; // sariq va biroz kattaroq

function buildAss(timeline, hookText = '', overlays = []) {
  let out = assHeader(F.SUB[0], F.SUB[1]);
  for (const o of overlays) {
    const anim = '{\\fscx40\\fscy40\\t(0,180,\\fscx108\\fscy108)\\t(180,280,\\fscx100\\fscy100)\\fad(0,300)}';
    out += `Dialogue: 1,${assTime(o.start)},${assTime(o.end)},Hook,,0,0,0,,${anim}${assEsc(o.text.toUpperCase())}\n`;
  }
  // HOOK sarlavha: 1-sahna davomida tepada katta sariq yozuv, "sakrab" chiqadi
  if (hookText) {
    const end = Math.max(1.8, timeline[0].start + timeline[0].dur);
    const anim = '{\\frz-3\\fscx30\\fscy30\\t(0,160,\\fscx112\\fscy112)\\t(160,260,\\fscx100\\fscy100)\\fad(0,200)}';
    out += `Dialogue: 1,${assTime(0)},${assTime(end)},Hook,,0,0,0,,${anim}${assEsc(hookText.toUpperCase())}\n`;
  }
  for (const seg of timeline) {
    const w = seg.words.map((x) => ({ ...x, text: assEsc(x.text.toUpperCase()) }));
    const segEnd = seg.start + seg.dur;
    for (let i = 0; i < w.length; ) {
      // 1–3 so'zli bo'lak; uzun pauza yoki 16 belgidan oshsa — bo'lak tugaydi
      const chunk = [w[i]];
      while (chunk.length < 3 && i + chunk.length < w.length) {
        const next = w[i + chunk.length];
        const len = chunk.map((c) => c.text).join(' ').length + next.text.length;
        if (next.start - chunk[chunk.length - 1].end > 0.25 || len > 16) break;
        chunk.push(next);
      }
      i += chunk.length;
      const chunkEnd = i < w.length ? Math.min(w[i].start, segEnd) : Math.min(chunk[chunk.length - 1].end + 0.35, segEnd);
      // Har bir so'z aytilayotganda o'sha so'z sariq yonadi
      chunk.forEach((word, j) => {
        const start = j === 0 ? chunk[0].start : word.start;
        const end = j < chunk.length - 1 ? chunk[j + 1].start : chunkEnd;
        if (end - start < 0.02) return;
        const pop = j === 0 ? '{\\fscx85\\fscy85\\t(0,90,\\fscx100\\fscy100)}' : '';
        const text = chunk.map((c, k) => (k === j ? `${HIGHLIGHT}${c.text}{\\r}` : c.text)).join(' ');
        out += `Dialogue: 0,${assTime(start)},${assTime(end)},Main,,0,0,0,,${pop}${text}\n`;
      });
    }
  }
  return out;
}

// ================= THUMBNAIL =================
async function makeThumbnail(runDir, image, hook) {
  const long = W > H;
  const size = long ? (hook.length <= 18 ? 190 : 150) : (hook.length <= 20 ? 190 : 150);
  const ass = assHeader(size, long ? 90 : 640) +
    `Dialogue: 0,0:00:00.00,0:00:05.00,Main,,0,0,0,,{\\c&H00E5FF&\\bord10}${assEsc(hook.toUpperCase())}\n`;
  fs.writeFileSync(path.join(runDir, 'thumb.ass'), ass);
  // YouTube thumbnail cheklovi: 2MB gacha. Uzun video uchun 1280x720.
  await ffmpeg(['-i', image, '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},ass=thumb.ass:fontsdir=${FONTS_DIR},` +
    `scale=${F.THUMB[0]}:${F.THUMB[1]}`, '-frames:v', '1', '-q:v', '3', 'thumbnail.jpg'], { cwd: runDir });
}

// Ovoz effektlari: birinchi marta ishga tushganda ffmpeg o'zi yasaydi (yuklab olish shart emas).
// assets/sfx/ ga o'zingizning whoosh.wav / ding.wav faylingizni qo'ysangiz — o'shalar ishlatiladi.
async function ensureSfx() {
  const dir = path.join(ROOT, 'assets', 'sfx');
  const whoosh = path.join(dir, 'whoosh.wav');
  const ding = path.join(dir, 'ding.wav');
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (!exists(whoosh)) {
      await ffmpeg(['-f', 'lavfi', '-i', "aevalsrc='(random(0)*2-1)*pow(sin(PI*t/0.45)\\,2)':s=44100:d=0.45",
        '-af', 'highpass=f=350,lowpass=f=2800,aecho=0.6:0.5:25:0.35,volume=1.6', '-ac', '2', whoosh]);
    }
    if (!exists(ding)) {
      await ffmpeg(['-f', 'lavfi', '-i',
        "aevalsrc='0.55*sin(2*PI*1568*t)*exp(-5*t)+0.28*sin(2*PI*2352*t)*exp(-7*t)+0.14*sin(2*PI*3136*t)*exp(-9*t)':s=44100:d=0.9",
        '-af', 'afade=t=in:d=0.004', '-ac', '2', ding]);
    }
    return { whoosh, ding };
  } catch (err) {
    log(`   ⚠️  Ovoz effektlari yasalmadi (${err.message.slice(0, 80)}) — effektlarsiz davom etaman`);
    return null;
  }
}

function pickMusic() {
  const dir = config.paths.music;
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f));
  return files.length ? path.join(dir, files[Math.floor(Math.random() * files.length)]) : null;
}
