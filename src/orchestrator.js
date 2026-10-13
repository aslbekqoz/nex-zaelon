// ORKESTRATOR — oshxona boshlig'i.
// Agentlarni navbat bilan chaqiradi, har bosqichdan keyin fayl paydo bo'lganini tekshiradi.
// Fayl allaqachon bo'lsa — o'sha bosqich o'tkazib yuboriladi (xatodan keyin davom ettirish shunday ishlaydi).
//
//   npm start                      -> topics.txt dagi navbatdagi mavzu (yoki tugallanmagan ishni davom ettiradi)
//   npm start -- --topic "Sharks"  -> aniq mavzu
//   npm run mock                   -> API kalitlarsiz sinov
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { log, setLogDir } from './lib/log.js';
import { notify } from './lib/telegram.js';
import { retry, exists, readJson, writeJson, slugify } from './lib/util.js';
import { runResearch } from './agents/research.js';
import { runScript } from './agents/script.js';
import { runLongScript } from './agents/script_long.js';
import { runVideo } from './agents/video.js';
import { runMetadata } from './agents/metadata.js';
import { runApproval } from './agents/approval.js';
import { runUpload } from './agents/upload.js';
import { askJson } from './lib/gemini.js';
import { scheduling, needMore, needLong, fmtSlot } from './lib/schedule.js';
import { runAnalytics, insights } from './agents/analytics.js';

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
const RUNS = config.paths.runs;
fs.mkdirSync(RUNS, { recursive: true });

// --- Bir vaqtning o'zida faqat bitta ishga tushish (cron ikki marta chaqirsa ham) ---
const LOCK = path.join(RUNS, '.lock');
function takeLock() {
  if (fs.existsSync(LOCK)) {
    const pid = Number(fs.readFileSync(LOCK, 'utf8'));
    try { process.kill(pid, 0); console.log(`Tizim allaqachon ishlayapti (pid ${pid}). Chiqaman.`); process.exit(0); } catch { /* eski lock */ }
  }
  fs.writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => fs.rmSync(LOCK, { force: true }));
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
}

const topicsFile = (kind) => (kind === 'long' ? config.paths.topicsLong : config.paths.topics);

function topicList(kind = 'short') {
  const f = topicsFile(kind);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}
const nextTopic = (kind) => topicList(kind)[0] || null;

const REFILL = {
  short: {
    system: 'You pick topics for a family-friendly "Did you know?" YouTube Shorts channel about animals, nature, space and the human body.',
    ask: 'Suggest 15 new topics with surprising, little-known facts that make people say "wow". ' +
      'Each topic must be the EXACT title of an existing, long English Wikipedia article (e.g. "Mantis shrimp", "Neutron star"). ' +
      'Mix categories: about 60% animals, 25% space, 15% nature/human body. No people, no politics, no violence, no disasters.\n',
  },
  long: {
    system: 'You pick topics for 7-minute "Top 10 mind-blowing facts about X" videos on a family-friendly animated facts channel.',
    ask: 'Suggest 8 topics that are famous enough to attract searches AND have at least 10 surprising facts. ' +
      'Each must be the EXACT title of a very long English Wikipedia article (e.g. "Octopus", "Black hole", "Honey bee", "Moon"). ' +
      'Mostly animals and space, some nature/human body. No people, no politics, no violence, no disasters.\n',
  },
};

// Mavzular kamayib qolsa — Gemini yangilarini taklif qiladi va ro'yxatga qo'shadi.
// Avval chiqqan (done.txt) va navbatdagi mavzular takrorlanmaydi. Xato bo'lsa — jim o'tib ketadi.
async function refillTopics(kind = 'short') {
  const queue = topicList(kind);
  if (config.mock || queue.length >= (kind === 'long' ? 2 : 3)) return;
  const done = fs.existsSync(config.paths.done)
    ? fs.readFileSync(config.paths.done, 'utf8').split('\n')
      .filter((l) => (kind === 'long') === l.includes('[long]'))
      .map((l) => l.split(/\s{2,}/)[1]).filter(Boolean)
    : [];
  const seen = new Set([...queue, ...done].map((t) => t.toLowerCase()));
  // Tahlilchi agent ma'lumoti: auditoriyaga nima yoqqani (bo'lsa)
  const ins = insights('short');
  const learn = ins ? `What OUR audience liked most (suggest more topics of these kinds): ${ins.best.join('; ')}.\n` +
    `What performed worst (avoid similar kinds): ${ins.worst.join('; ')}.\n` : '';
  try {
    const r = await askJson({
      temperature: 0.9,
      system: REFILL[kind].system,
      prompt: REFILL[kind].ask + learn + `Do NOT suggest any of these (already used): ${[...seen].join(', ')}\n` + 'Return JSON: {"topics":["...", "..."]}',
    });
    const fresh = [...new Set((r.topics || []).map((t) => String(t).trim()))]
      .filter((t) => t && t.length <= 40 && !seen.has(t.toLowerCase()));
    if (!fresh.length) return;
    const f = topicsFile(kind);
    const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    fs.writeFileSync(f, cur.replace(/\n*$/, '\n') + fresh.join('\n') + '\n');
    const name = path.basename(f);
    log(`🧠 Mavzular kam qoldi — ${name} ga ${fresh.length} ta yangi mavzu qo'shildi: ${fresh.join(', ')}`);
    await notify(`🧠 ${name} ga ${fresh.length} ta yangi mavzu qo'shildi:\n${fresh.join(', ')}\n\nYoqmaganini ${name} dan o'chirib qo'yishingiz mumkin.`);
  } catch (err) {
    log(`   ⚠️  Yangi mavzular qo'shilmadi: ${err.message}`);
  }
}

// Oldingi safar xato bilan to'xtagan ish bormi?
function unfinishedRun() {
  const dirs = fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'status.json'))).sort();
  for (const d of dirs.reverse()) {
    const st = readJson(path.join(RUNS, d, 'status.json'));
    if (st.status === 'running' || st.status === 'failed') return { dir: path.join(RUNS, d), topic: st.topic, kind: st.kind || 'short' };
  }
  return null;
}

function finishTopic(topic, note, kind = 'short') {
  if (config.mock) return; // sinovda ro'yxatga tegmaymiz
  const f = topicsFile(kind);
  if (fs.existsSync(f)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    const i = lines.findIndex((l) => l.trim() === topic);
    if (i > -1) { lines.splice(i, 1); fs.writeFileSync(f, lines.join('\n')); }
  }
  fs.appendFileSync(config.paths.done, `${today()}  ${topic}  ${kind === 'long' ? '[long] ' : ''}${note}\n`);
}

async function main() {
  takeLock();
  await runAnalytics(); // kuniga 1 marta statistika + dushanba kuni haftalik hisobot (xato bo'lsa — jim o'tadi)

  let topic = argValue('--topic');
  let runDir;
  let kind = process.argv.includes('--long') ? 'long' : 'short';
  const resume = !topic && unfinishedRun();
  if (resume) {
    ({ dir: runDir, topic, kind } = resume);
  } else {
    // --resume-only: faqat xato bilan to'xtagan ishni davom ettiradi, yangi video boshlamaydi
    if (process.argv.includes('--resume-only')) { console.log('Tugallanmagan ish yo\'q.'); return; }
    // --fill: rejalashtirish buferini to'ldirish — kerak bo'lsagina yangi video boshlanadi
    // Avval uzun video kerakmi (vaqti kelgan bo'lsa), keyin Shorts buferi.
    if (process.argv.includes('--fill') && kind === 'short') {
      const stamp = `[${new Date().toISOString()}]`;
      const nl = config.longSlots.length ? needLong() : { ok: false };
      if (nl.ok) {
        kind = 'long';
        console.log(`${stamp} Uzun video vaqti: ${fmtSlot(nl.slot)} uchun tayyorlayman`);
      } else {
        if (!scheduling()) { console.log('PUBLISH_SLOTS .env da yo\'q — --fill ishlamaydi.'); return; }
        const need = needMore();
        if (!need.ok) { console.log(`${stamp} Yangi video kerak emas: ${need.why}`); return; }
        console.log(`${stamp} Navbatdagi bo'sh slot: ${fmtSlot(need.slot)} (oldinda ${need.ahead} ta video bor)`);
      }
    }
    if (!topic) await refillTopics(kind);
    topic = topic || nextTopic(kind);
    if (!topic) { console.log(`${path.basename(topicsFile(kind))} bo'sh — yangi mavzular qo'shing.`); return; }
    runDir = path.join(RUNS, `${today()}_${slugify(topic)}${kind === 'long' ? '_long' : ''}`);
    if (fs.existsSync(path.join(runDir, 'status.json')) && ['uploaded', 'rejected'].includes(readJson(path.join(runDir, 'status.json')).status)) {
      runDir += `_${Date.now().toString(36)}`;
    }
  }
  fs.mkdirSync(runDir, { recursive: true });
  setLogDir(runDir);
  const status = (s, step) => writeJson(path.join(runDir, 'status.json'), { topic, kind, status: s, step, updatedAt: new Date().toISOString() });

  log(`================ ${resume ? 'DAVOM ETTIRISH' : 'YANGI ISH'}${kind === 'long' ? ' (UZUN VIDEO 16:9)' : ''}: "${topic}" ${config.mock ? '[MOCK]' : ''}`);
  log(`Papka: ${runDir}`);

  const f = (name) => path.join(runDir, name);
  const steps = [
    { name: '2-agent: Tadqiqot', out: 'research.json',
      fn: () => runResearch(topic, f('research.json'), kind === 'long' ? { extract: 25, keep: 14, min: 8 } : {}) },
    { name: kind === 'long' ? '1-agent: Uzun ssenariy' : '1-agent: Ssenariy', out: 'script.json',
      fn: () => (kind === 'long' ? runLongScript : runScript)(f('research.json'), f('script.json')) },
    { name: '3-agent: Video', out: 'video.mp4', fn: () => runVideo(runDir) },
    { name: '4-agent: Metadata', out: 'metadata.json', fn: () => runMetadata(runDir, f('metadata.json')) },
    { name: '5-agent: Telegram ruxsat', out: 'approval.json', fn: () => runApproval(runDir, f('approval.json')) },
    { name: '4-agent: YouTube yuklash', out: 'upload.json', fn: () => runUpload(runDir, f('upload.json')), when: () => readJson(f('approval.json')).decision === 'approve' },
  ];

  const waits = config.mock ? [1000, 2000] : [30_000, 90_000];
  for (const step of steps) {
    if (step.when && !step.when()) continue;
    if (exists(f(step.out))) { log(`⏭️  ${step.name}: ${step.out} allaqachon bor, o'tkazib yuboraman`); continue; }
    status('running', step.name);
    log(`▶️  ${step.name}`);
    try {
      await retry(step.name, step.fn, { tries: 3, waits });
      if (!exists(f(step.out))) throw new Error(`${step.out} yaratilmadi`);
    } catch (err) {
      status('failed', step.name);
      log(`❗ ${step.name} 3 marta urinishdan keyin ham ishlamadi: ${err.message}`);
      // Cloudflare kunlik bepul limiti tugagan bo'lsa — har soat xabar yubormaymiz, ertaga o'zi davom etadi
      if (/daily free allocation|neurons|4006/i.test(err.message)) {
        log('   💤 Cloudflare kunlik limiti tugadi — soat 05:00 dan keyin (limit yangilangach) shu joydan davom etadi');
      } else {
        await notify(`❗ <b>${step.name}</b> bosqichida xato\nMavzu: ${topic}\n${String(err.message).slice(0, 300)}\n\nKeyingi ishga tushishda shu joydan davom etadi.`);
      }
      process.exitCode = 1;
      return;
    }
  }

  const approval = readJson(f('approval.json'));
  if (approval.decision === 'approve') {
    const up = readJson(f('upload.json'));
    status('uploaded', 'done');
    finishTopic(topic, up.url || '(mock)', kind);
    log(`🎉 TAYYOR: ${up.url || '(mock rejimda yuklanmadi)'}`);
    if (up.url) {
      await notify(up.publishAt
        ? `📅 Video rejalashtirildi: ${up.url}\nE'lon vaqti: <b>${fmtSlot(new Date(up.publishAt))}</b>`
        : `🎉 Video yuklandi: ${up.url}\nHolati: ${up.privacy}`);
    }
  } else {
    status('rejected', 'done');
    finishTopic(topic, 'rad etildi', kind);
    log('🚫 Video rad etildi, yuklanmadi.');
  }
}

main().catch(async (err) => {
  log(`❗ Kutilmagan xato: ${err.stack || err.message}`);
  await notify(`❗ Kutilmagan xato: ${String(err.message).slice(0, 300)}`);
  process.exitCode = 1;
});
