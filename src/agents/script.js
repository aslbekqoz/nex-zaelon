// 1-AGENT: Ssenariynavis
// Vazifa: research.json dagi faktlardan kuchli hook -> qisqa sahnalar -> ochiq savol -> eng zo'r fakt -> hook'ga ulanuvchi LOOP
// tuzilmali ssenariy yozish. Har bir sahna = 1 qisqa gap + shu gapni SO'ZMA-SO'Z tasvirlaydigan rasm.
// Bitta doimiy QAHRAMON tavsifi ham yoziladi — barcha rasmlarda bir xil ko'rinishi uchun.
// QOIDA: faqat research.json dagi faktlar! Natija: script.json
import { config } from '../config.js';
import { askJson } from '../lib/gemini.js';
import { log } from '../lib/log.js';
import { readJson, writeJson } from '../lib/util.js';

// Barcha sahnalar bir xil uslubda chiqishi uchun har bir rasm so'roviga qo'shiladi
export const STYLE =
  '2D cartoon illustration in a polished modern animated-series style, vibrant saturated colors, ' +
  'bold clean outlines, soft cel shading, cinematic lighting, detailed simple background, ' +
  'vertical 9:16 composition, subject large in frame, no text, no letters, no captions, no watermark';

const MAX_SCENE_WORDS = 14;
const CTA_RE = /\b(follow|subscribe|like this video|comment below)\b/i;

function problems(s, ids) {
  const out = [];
  if (!s.scenes?.length) return ['sahna yo\'q'];
  const hook = s.scenes[0].narration.trim();
  if (/^(did you know|have you ever|do you know)/i.test(hook) || /\?\s*$/.test(hook)) out.push('hook savol yoki "Did you know" bo\'lmasin — darhol eng hayratlanarli gapni ayt');
  if (hook.split(/\s+/).length > 12) out.push('hook 12 so\'zdan oshmasin');
  const osh = String(s.onScreenHook || '').trim().split(/\s+/).filter(Boolean).length;
  if (!osh || osh > 5) out.push('onScreenHook 2-5 so\'z bo\'lsin');
  for (const sc of s.scenes) {
    const n = sc.narration.split(/\s+/).length;
    if (n > MAX_SCENE_WORDS) out.push(`${sc.scene}-sahna juda uzun (${n} so'z) — max ${MAX_SCENE_WORDS}`);
    const bad = (sc.facts || []).filter((id) => !ids.has(Number(id)));
    if (bad.length) out.push(`${sc.scene}-sahna mavjud bo'lmagan faktga tayandi: ${bad.join(',')}`);
  }
  const last = s.scenes[s.scenes.length - 1].narration;
  if (CTA_RE.test(last)) out.push('oxirgi sahna "follow/subscribe" bo\'lmasin — u hook\'ga ulanib ketadigan LOOP gap bo\'lsin');
  return out;
}

export async function runScript(researchFile, outFile) {
  const research = readJson(researchFile);
  if (config.mock) return writeJson(outFile, mockScript(research));

  log(`✍️  Ssenariy: ${research.facts.length} ta fakt asosida yozyapman`);
  const factList = research.facts.map((f) => `[${f.id}] ${f.text}`).join('\n');
  const ids = new Set(research.facts.map((f) => f.id));
  let feedback = '';
  let s;

  // Ssenariy qoidalarga mos kelmasa — sababini aytib, qayta yozdiramiz (2 martagacha)
  for (let attempt = 1; attempt <= 3; attempt++) {
    s = await askJson({
      temperature: 0.85,
      system:
        'You are a top YouTube Shorts scriptwriter for a "Did you know?"-style facts channel whose videos get millions of views ' +
        'because viewers watch them to the end and replay them. Simple, punchy, conversational English that a 12-year-old understands. ' +
        'You may ONLY use the numbered facts given to you. Never invent facts, numbers or claims.',
      prompt:
        `Topic: ${research.topic}\nFacts:\n${factList}\n\n` +
        `Write a Shorts script of ${config.scenes} scenes, about ${config.scriptWords} words of narration in total (35-45 seconds).\n\n` +
        'RETENTION RULES (most important):\n' +
        '1. Scene 1 = HOOK: the single most shocking fact as a bold statement, max 12 words. ' +
        'NEVER a question, NEVER "Did you know"/"Have you ever". Example: "This animal can stay hanging in a tree even after it dies."\n' +
        '2. "onScreenHook": 2-5 word headline shown huge on screen during the hook, e.g. "IT NEVER FALLS" or "3 HEARTS?!". Must create curiosity, not repeat the whole hook.\n' +
        '3. Scene 2 must make it personal or concrete, talking to the viewer as "you" (e.g. "If you did that, you\'d ..."), or give a vivid comparison.\n' +
        '4. Around the middle add ONE open loop that promises something better, e.g. "But that\'s not even the weirdest part." — and deliver it later.\n' +
        '5. Escalate: every fact more surprising than the last. Use concrete numbers and size/time comparisons from the facts ("as long as a school bus").\n' +
        `6. Every scene = exactly ONE short sentence, max ${MAX_SCENE_WORDS} words. No filler words ("basically", "actually", "so").\n` +
        '7. LOOP ENDING: the LAST scene must NOT be a call to action. It is a short line that flows naturally back into scene 1 when the video replays, ' +
        'so the end and the beginning form one sentence. Example: last scene "And the reason scientists still can\'t explain it is that..." + hook "This animal can stay hanging...". ' +
        'TEST before answering: read "<last scene> <scene 1>" aloud as ONE sentence — it must be grammatical, logical and TRUE according to the facts. ' +
        'Bad: "Their arms keep moving because, an octopus\'s heart stops when it swims" (no logical link). ' +
        'Good: "...and that is why scientists say" + "This animal has three hearts and blue blood." ' +
        'Never write "follow", "subscribe" or "like".\n\n' +
        'VISUAL RULES:\n' +
        '8. "visual" must LITERALLY show what the sentence says (if it says "as big as an elephant", show the creature next to an elephant for scale). ' +
        'One clear dramatic moment, concrete, close and dynamic camera, no text. ' +
        'Never put objects that normally carry writing in the visual (no chalkboards, signs, books, screens, clocks, equations, maps with labels, posters) — AI images turn them into garbled letters. ' +
        'Visuals must be FAMILY-FRIENDLY for an image AI safety filter: never describe death, corpses, blood, injury, killing, digestion, excrement or mating — show such facts gently and symbolically (e.g. "dies" -> "sleeping peacefully").\n' +
        '9. Define ONE recurring main character in "character": the topic itself drawn as a cute cartoon ANIMAL mascot (species, fur/skin colors, face, distinctive features, expression) in 25-40 words. ' +
        'Natural animal body fully covered in fur/skin/scales — never describe a human-like body, bare belly, navel or chest. ' +
        'Set "useCharacter": true for scenes where this main character appears, false for scenes that must show something else (e.g. an extinct relative, a map, an organ).\n' +
        '10. "facts": ids of facts used in the scene ([] if none).\n' +
        'Return JSON: {"onScreenHook":"...","character":"...","scenes":[{"scene":1,"narration":"...","visual":"...","useCharacter":true,"facts":[1]}]}' +
        feedback,
    });
    const issues = problems(s, ids);
    if (!issues.length) break;
    log(`   🔁 Ssenariy qoidalarga mos emas (${attempt}/3): ${issues.join('; ')}`);
    if (attempt === 3) {
      if (issues.some((i) => i.includes('mavjud bo\'lmagan'))) throw new Error(issues.join('; '));
      log('   ⚠️  Kichik kamchiliklar bilan davom etaman');
      break;
    }
    feedback = `\n\nYOUR PREVIOUS ATTEMPT BROKE THESE RULES — fix them: ${issues.join('; ')}`;
  }

  const scenes = s.scenes.map((x, i) => ({
    scene: i + 1,
    narration: x.narration.trim(),
    visual: x.visual.trim(),
    useCharacter: x.useCharacter !== false,
    facts: x.facts || [],
  }));
  const words = scenes.map((x) => x.narration).join(' ').split(/\s+/).length;
  log(`   ✅ ${scenes.length} ta sahna, ${words} so'z`);
  // onScreenHook noto'g'ri bo'lsa — hook'ning birinchi 4 so'zi
  const onScreenHook = (String(s.onScreenHook || '').trim().split(/\s+/).length <= 5 && String(s.onScreenHook || '').trim())
    || scenes[0].narration.split(/\s+/).slice(0, 4).join(' ');
  log(`   🎣 Hook: "${scenes[0].narration}"  |  Ekranda: "${onScreenHook}"`);
  log(`   🔁 Loop: "${scenes[scenes.length - 1].narration}" -> "${scenes[0].narration}"`);
  log(`   🦥 Qahramon: ${String(s.character).slice(0, 90)}...`);

  // seed: barcha rasmlar bir xil "tasodif" bilan chizilsa, qahramon ko'rinishi yaqinroq chiqadi
  const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
  writeJson(outFile, { topic: research.topic, hook: scenes[0].narration, onScreenHook, character: s.character, style: STYLE, seed, scenes });
}

function mockScript(research) {
  log('✍️  [MOCK] Ssenariy');
  const scenes = [
    { narration: 'This animal has three hearts and blue blood.', visual: 'octopus with three glowing hearts' },
    { narration: 'Meet the octopus.', visual: 'octopus waving' },
    { narration: 'Most of its brain cells live in its arms.', visual: 'octopus arms glowing with neurons' },
    { narration: 'And the strangest part is that...', visual: 'happy octopus winking' },
  ];
  return {
    topic: research.topic, hook: scenes[0].narration, onScreenHook: '3 HEARTS?!', character: 'a cute purple cartoon octopus with big eyes', style: STYLE, mock: true,
    scenes: scenes.map((s, i) => ({ scene: i + 1, ...s, useCharacter: true, facts: [] })),
  };
}
