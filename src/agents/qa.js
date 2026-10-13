// 🆕 AGENT: Sifat nazoratchisi (art-direktor)
// Rasmlar chizilgach, montajdan OLDIN Gemini har bir rasmni "ko'radi" va baholaydi:
//   - rasm aytilayotgan gapni aniq ko'rsatadimi (eng muhimi)
//   - qahramon tavsifga mosmi
//   - rasmda yozuv / buzilgan harflar / watermark yo'qmi
//   - anatomiya xatolari (ortiqcha oyoq, erigan yuz) yo'qmi
// Past baho olgan rasmlar (ko'pi bilan 4 ta) tuzatilgan tavsif bilan QAYTA chiziladi.
// Xato bo'lsa — video to'xtamaydi, shunchaki tekshiruvsiz davom etadi. Natija: qa.json
import fs from 'node:fs';
import path from 'node:path';
import { askJson } from '../lib/gemini.js';
import { ffmpeg } from '../lib/ffmpeg.js';
import { log } from '../lib/log.js';
import { writeJson } from '../lib/util.js';

const PASS = 6; // shundan past baho — qayta chiziladi
const MAX_REDO = 4; // uzun videoda 8

export async function qualityCheck(runDir, script, segs, redraw) {
  const out = path.join(runDir, 'qa.json');
  log(`🧪 Sifat nazorati: ${segs.length} ta rasmni tekshiryapman`);
  try {
    const images = [];
    for (const s of segs) {
      const small = path.join(runDir, 'images', `qa_${s.id}.jpg`);
      await ffmpeg(['-i', s.file, '-vf', 'scale=384:-2', '-q:v', '5', small]);
      images.push({ label: `IMAGE ${s.id}`, b64: fs.readFileSync(small).toString('base64') });
      fs.rmSync(small, { force: true });
    }
    const narration = (scene) => script.scenes.find((x) => x.scene === scene)?.narration || '';
    const list = segs.map((s) => `- ${s.id}: narration "${narration(s.scene)}" | intended visual: ${s.visual}` +
      `${s.useCharacter ? ' | main character should appear' : ''}`).join('\n');

    const r = await askJson({
      temperature: 0.2,
      system: 'You are a strict art director for a family-friendly animated YouTube facts channel. ' +
        'You judge AI-generated illustrations honestly and specifically.',
      prompt:
        `Topic: ${script.topic}\nMain character: ${script.character}\n\nImages to review (id: what is said at that moment):\n${list}\n\n` +
        'Score EVERY image 1-10. Most important: does a viewer instantly SEE what the narration says at that moment? ' +
        'Also check: main character matches its description (when it should appear); NO visible text, letters, numbers, garbled words or watermarks; ' +
        `no anatomy errors (extra/missing limbs, melted faces, merged bodies); clear subject in a ${script.format === 'long' ? 'horizontal 16:9' : 'vertical 9:16'} frame; family-friendly. ` +
        `Any serious problem means a score below ${PASS}. ` +
        'For images below the bar write "fix": a NEW concrete visual description (one moment, literal, no text in the image) that would fix it.\n' +
        'Return JSON: {"images":[{"id":"1","score":8,"problems":"...","fix":""}]}',
      images,
    });

    const scores = (r.images || []).map((x) => ({ ...x, id: String(x.id), score: Number(x.score) }));
    const bad = scores.filter((x) => x.score < PASS && segs.some((s) => s.id === x.id))
      .sort((a, b) => a.score - b.score).slice(0, script.format === 'long' ? MAX_REDO * 2 : MAX_REDO);
    const avg = scores.length ? scores.reduce((a, x) => a + (x.score || 0), 0) / scores.length : 0;
    log(`   📊 O'rtacha baho: ${avg.toFixed(1)}/10${bad.length ? ` — ${bad.length} ta rasm qayta chiziladi` : ' — hammasi yaxshi'}`);

    const redone = [];
    for (const b of bad) {
      const s = segs.find((x) => x.id === b.id);
      const visual = String(b.fix || '').trim() || s.visual;
      log(`   🔁 ${b.id} (${b.score}/10): ${String(b.problems || '').slice(0, 90)}`);
      try {
        await redraw(s, visual);
        redone.push({ id: b.id, was: b.score, problems: b.problems, newVisual: visual });
      } catch (err) {
        log(`   ⚠️  ${b.id} qayta chizilmadi (${err.message.slice(0, 80)}) — eskisi qoladi`);
      }
    }
    writeJson(out, { checked: segs.length, average: Number(avg.toFixed(1)), redone, scores });
  } catch (err) {
    log(`   ⚠️  Sifat nazorati o'tkazib yuborildi: ${err.message.slice(0, 120)}`);
    writeJson(out, { skipped: true, reason: err.message.slice(0, 200) });
  }
}
