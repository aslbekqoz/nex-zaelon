// NEX ZAELON — musiqa kanali orkestratori.
// Ish tartibi: Google Flow'dan olingan qo'shiqlarni (mp3/wav) nex-inbox/ papkasiga tashlaysiz — qolganini tizim qiladi:
//   1 Tinglovchi  -> lirika + vaqtlar, naqarot, janr (Gemini audio)
//   2 Rassom      -> muqova rasmi (Cloudflare FLUX)
//   3 Montajchi   -> 9:16 lirik video, rejadagi shablonda (ffmpeg)
//   4 Nashriyotchi-> sarlavha/tavsif, e'lon vaqti (11:30/17:30/23:30 yoki rejadagi vaqt), YouTube'ga rejalashtirib yuklash
// Har qadam natijasi faylga yoziladi: xato bo'lsa keyingi ishga tushishda o'sha joydan davom etadi.
//   npm run nex           -> inbox'dagi hamma qo'shiqlarni ishlaydi
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { log, setLogDir } from '../lib/log.js';
import { notify } from '../lib/telegram.js';
import { readJson, writeJson, exists, retry, slugify } from '../lib/util.js';
import { nex } from './config.js';
import { runListen } from './listen.js';
import { runCover } from './cover.js';
import { runRender } from './render.js';
import { buildMetadata, chooseSlot, chooseTemplate, runUpload, loadRemoteSlots, remoteCount } from './publish.js';

const AUDIO = /\.(mp3|wav|m4a|ogg|flac|aac)$/i;
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
for (const d of [nex.paths.inbox, nex.paths.processed, nex.paths.runs]) fs.mkdirSync(d, { recursive: true });

// Bir vaqtda faqat bitta nusxa ishlaydi
const LOCK = path.join(nex.paths.runs, '.lock');
if (fs.existsSync(LOCK)) {
  const pid = Number(fs.readFileSync(LOCK, 'utf8'));
  try { process.kill(pid, 0); console.log(`Nex allaqachon ishlayapti (pid ${pid}).`); process.exit(0); } catch { /* eski lock */ }
}
fs.writeFileSync(LOCK, String(process.pid));
process.on('exit', () => fs.rmSync(LOCK, { force: true }));

const plan = fs.existsSync(nex.paths.plan) ? readJson(nex.paths.plan).tracks : [];
// "02 - Rainy Window (v2).mp3" -> rejadagi "Rainy Window"
function planFor(fileName) {
  const s = slugify(path.parse(fileName).name);
  const low = path.parse(fileName).name.toLowerCase();
  return plan.find((p) => (slugify(p.title) && s.includes(slugify(p.title))) || low.includes(p.title.toLowerCase())) || null; // kirill nomlar ham
}

// 1) Inbox'dagi yangi fayllar -> har biri uchun ish papkasi (audio ichiga ko'chiriladi)
function intake() {
  const files = fs.readdirSync(nex.paths.inbox).filter((f) => AUDIO.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(nex.paths.inbox, f)).mtimeMs })).sort((a, b) => a.t - b.t);
  for (const { f } of files) {
    const src = path.join(nex.paths.inbox, f);
    let dir = path.join(nex.paths.runs, `${today()}_${slugify(path.parse(f).name) || 'track'}`);
    if (fs.existsSync(dir)) dir += `_${Date.now().toString(36)}`;
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, path.join(dir, `source${path.extname(f).toLowerCase()}`));
    writeJson(path.join(dir, 'status.json'), { file: f, plan: planFor(f), status: 'new', updatedAt: new Date().toISOString() });
    fs.renameSync(src, path.join(nex.paths.processed, f));
    console.log(`📥 Qabul qilindi: ${f}`);
  }
}

// 2) Tugallanmagan ishlar (yangi yoki xato bilan to'xtagan)
function pending() {
  return fs.readdirSync(nex.paths.runs).filter((d) => fs.existsSync(path.join(nex.paths.runs, d, 'status.json')))
    .sort().map((d) => path.join(nex.paths.runs, d))
    .filter((d) => !['uploaded', 'skipped'].includes(readJson(path.join(d, 'status.json')).status));
}

async function processRun(dir) {
  setLogDir(dir);
  const stFile = path.join(dir, 'status.json');
  const st = readJson(stFile);
  const status = (s, step, extra = {}) => writeJson(stFile, { ...readJson(stFile), status: s, step, ...extra, updatedAt: new Date().toISOString() });
  const f = (n) => path.join(dir, n);
  const audio = f(fs.readdirSync(dir).find((x) => x.startsWith('source.')));
  log(`================ NEX ZAELON: ${st.file}${st.plan ? ` (rejada: ${st.plan.title}, ${st.plan.genre})` : ''}`);

  const steps = [
    { name: 'Tinglovchi', out: 'listen.json', fn: () => runListen(audio, dir, st.plan) },
    { name: 'Vaqt va shablon', out: 'slot.json', fn: () => {
      const listen = readJson(f('listen.json'));
      const slot = chooseSlot(st.plan);
      const template = chooseTemplate(st.plan, listen.genre, slot);
      writeJson(f('slot.json'), { publishAt: slot.toISOString(), template });
      log(`📅 E'lon: ${slot.toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' })} (Toshkent), shablon ${template}`);
    } },
    { name: 'Muqova', out: 'cover.jpg', fn: () => runCover(dir, readJson(f('listen.json')), readJson(f('slot.json')).template) },
    { name: 'Montaj', out: 'video.mp4', fn: () => runRender(dir, audio, readJson(f('listen.json')), readJson(f('slot.json')).template) },
    { name: 'Metadata', out: 'metadata.json', fn: () => {
      // sarlavha shablonlari navbat bilan almashadi (har yangi qo'shiqda boshqasi)
      const local = fs.readdirSync(nex.paths.runs).filter((d) => fs.existsSync(path.join(nex.paths.runs, d, 'metadata.json'))).length;
      // kanaldagi videolar soni + shu ishga tushishda yuklanganlar -> har qo'shiqda boshqa sarlavha shabloni
      const index = remoteCount != null ? remoteCount + uploadedThisRun : local;
      const m = buildMetadata(readJson(f('listen.json')), index);
      writeJson(f('metadata.json'), m);
      log(`📝 ${m.title}`);
    } },
    { name: 'YouTube', out: 'upload.json', fn: () => runUpload(dir, new Date(readJson(f('slot.json')).publishAt)) },
  ];

  for (const step of steps) {
    if (exists(f(step.out))) continue;
    status('running', step.name);
    try {
      await retry(step.name, step.fn, { tries: 3, waits: config.mock ? [500, 1000] : [20_000, 60_000] });
      if (!exists(f(step.out))) throw new Error(`${step.out} yaratilmadi`);
    } catch (err) {
      // Har ishga tushishda qayta urinadi; 6 marta bo'lmasa — to'xtatib, sizga aytadi
      const attempts = (readJson(stFile).attempts || 0) + 1;
      const giveUp = attempts >= 6;
      status(giveUp ? 'skipped' : 'failed', step.name, { attempts, error: String(err.message).slice(0, 300) });
      log(`❗ ${step.name}: ${err.message} (urinish ${attempts})`);
      if (giveUp) {
        await notify(`⛔ <b>Nex Zaelon</b> — ${st.file}\n6 marta urindim, bo'lmadi (${step.name}):\n${String(err.message).slice(0, 200)}\n\nQo'shiqni qaytadan yuboring.`);
      } else if (attempts === 1 && !/daily free allocation|4006/i.test(err.message)) {
        await notify(`❗ <b>Nex Zaelon</b> — ${st.file}\n${step.name} bosqichida xato:\n${String(err.message).slice(0, 300)}\n\nKeyingi ishga tushishda o'zim qayta urinaman.`);
      }
      return false;
    }
  }
  status('uploaded', 'done');
  uploadedThisRun++;
  const up = readJson(f('upload.json'));
  const meta = readJson(f('metadata.json'));
  const when = new Date(readJson(f('slot.json')).publishAt).toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 16);
  log(`🎉 TAYYOR: ${up.url || '(mock)'} — e'lon ${when}`);
  if (up.url) await notify(`🎵 <b>Nex Zaelon</b>: rejalashtirildi\n${meta.title}\n📅 ${when} (Toshkent)\n${up.url}`);
  return true;
}

intake();
const jobs = pending();
if (!jobs.length) console.log(`[${new Date().toISOString()}] Nex: yangi qo'shiq yo'q (nex-inbox/ bo'sh).`);
let ok = 0;
let uploadedThisRun = 0;
if (jobs.length) await loadRemoteSlots();
for (const dir of jobs) if (await processRun(dir)) ok++;
if (jobs.length) console.log(`Nex: ${ok}/${jobs.length} ta qo'shiq tayyor.`);
