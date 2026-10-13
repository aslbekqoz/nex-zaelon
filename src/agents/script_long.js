// 🆕 AGENT: Uzun video ssenariynavisi (16:9, "Top 10" sanoq formati, ~7 daqiqa)
// Tuzilma: kuchli kirish (hook + va'da) -> #10 dan #1 gacha sanoq -> xulosa + obuna chaqiruvi.
// Har bir raqam = bitta bob (YouTube "chapters"). Har sahna = 1-2 gap + o'sha gapni ko'rsatadigan rasm.
// QOIDA: faqat research.json dagi faktlar! Natija: script.json (format: "long")
import { config } from '../config.js';
import { askJson } from '../lib/gemini.js';
import { log } from '../lib/log.js';
import { readJson, writeJson } from '../lib/util.js';

export const STYLE_LONG =
  '2D cartoon illustration in a polished modern animated-series style, vibrant saturated colors, ' +
  'bold clean outlines, soft cel shading, cinematic lighting, detailed background, ' +
  'horizontal 16:9 widescreen cinematic composition, subject clearly visible, no text, no letters, no captions, no watermark';

const MAX_SCENE_WORDS = 26;
const COUNT = 10;

function problems(s, ids) {
  const out = [];
  const scenes = s.scenes || [];
  if (scenes.length < 30) out.push(`sahnalar juda kam (${scenes.length}) — kamida 35 ta bo'lsin`);
  const words = scenes.map((x) => String(x.narration || '')).join(' ').split(/\s+/).length;
  if (words < config.longWords * 0.75) out.push(`matn juda qisqa (${words} so'z) — taxminan ${config.longWords} so'z kerak`);
  const hook = String(scenes[0]?.narration || '');
  if (/^(did you know|have you ever|hello|hi|welcome)/i.test(hook)) out.push('1-sahna salomlashish yoki "Did you know" bo\'lmasin — darhol eng hayratlanarli gap');
  for (const sc of scenes) {
    const n = String(sc.narration || '').split(/\s+/).length;
    if (n > MAX_SCENE_WORDS) out.push(`${sc.scene}-sahna juda uzun (${n} so'z)`);
    const bad = (sc.facts || []).filter((id) => !ids.has(Number(id)));
    if (bad.length) out.push(`${sc.scene}-sahna mavjud bo'lmagan faktga tayandi: ${bad.join(',')}`);
  }
  const ch = (s.chapters || []).filter((c) => scenes.some((x) => x.scene === c.scene));
  if (ch.length < Math.min(COUNT, ids.size)) out.push(`boblar (chapters) kam: ${ch.length}`);
  return out;
}

export async function runLongScript(researchFile, outFile) {
  const research = readJson(researchFile);
  const count = Math.min(COUNT, research.facts.length);
  if (config.mock) return writeJson(outFile, mockLong(research, count));

  log(`✍️  Uzun ssenariy: ${research.facts.length} ta faktdan "Top ${count}" yozyapman`);
  const factList = research.facts.map((f) => `[${f.id}] ${f.text}`).join('\n');
  const ids = new Set(research.facts.map((f) => f.id));
  let feedback = '';
  let s;
  for (let attempt = 1; attempt <= 3; attempt++) {
    s = await askJson({
      temperature: 0.8,
      system:
        'You are a top YouTube scriptwriter for a family-friendly animated "Did you know?" facts channel. Your long videos keep viewers ' +
        'to the end. Conversational, vivid English a 12-year-old understands. You may ONLY use the numbered facts given. Never invent facts or numbers.',
      prompt:
        `Topic: ${research.topic}\nFacts:\n${factList}\n\n` +
        `Write a "Top ${count} most mind-blowing facts about ${research.topic}" video: AT LEAST ${config.longWords} words of narration (~7 minutes), ` +
        `split into 42-50 scenes of 18-${MAX_SCENE_WORDS} words each. Length matters: a script under ${Math.round(config.longWords * 0.9)} words is rejected.\n\n` +
        'STRUCTURE:\n' +
        '- INTRO (3-4 scenes): scene 1 = the most shocking fact teased as a bold statement (NOT a greeting, NOT "Did you know"). ' +
        `Then a promise: "Here are ${count} facts ... and number one will ..." (open loop that pays off at #1).\n` +
        `- COUNTDOWN from #${count} down to #1: each number is ONE fact, 4-5 scenes (~85 words per number). The first scene of each number starts with "Number N." ` +
        'Then explain it, add a vivid comparison or "imagine if you..." moment, and end some numbers with a teaser for the next one ("But the next one is even stranger."). ' +
        'Order facts from interesting to MOST surprising (#1 = best).\n' +
        '- OUTRO (2 scenes): short recap of #1 and a natural call to subscribe for more facts.\n\n' +
        'RULES:\n' +
        `- Each scene: 1-2 sentences, max ${MAX_SCENE_WORDS} words.\n` +
        '- "visual": what the image LITERALLY shows at that moment (one clear moment, concrete, horizontal widescreen framing, no text). ' +
        'Never put objects that normally carry writing in the visual (no chalkboards, signs, books, screens, clocks, equations, maps with labels, posters) — AI images turn them into garbled letters. ' +
        'FAMILY-FRIENDLY for an image AI safety filter: never describe death, blood, injury, killing, digestion, excrement or mating — show such things gently and symbolically.\n' +
        '- "character": ONE recurring cute cartoon ANIMAL mascot for the topic (species, colors, face, distinctive features) in 25-40 words, natural animal body fully covered in fur/skin/scales. ' +
        'Set "useCharacter" true where it appears, false where the scene must show something else.\n' +
        '- "facts": ids used in the scene ([] if none).\n' +
        '- "chapters": one entry per countdown number: {"scene": first scene number of that number, "title": "#N: short catchy title (max 40 chars)"}.\n' +
        '- "onScreenHook": 2-5 word thumbnail headline (e.g. "OCTOPUS IS ALIEN?!").\n' +
        'Return JSON: {"onScreenHook":"...","character":"...","chapters":[{"scene":4,"title":"#10: ..."}],' +
        '"scenes":[{"scene":1,"narration":"...","visual":"...","useCharacter":true,"facts":[1]}]}' + feedback,
    });
    // sahnalar raqamini tartibga keltiramiz (Gemini ba'zan tashlab ketadi)
    s.scenes = (s.scenes || []).map((x, i) => ({ ...x, _old: x.scene, scene: i + 1 }));
    s.chapters = (s.chapters || []).map((c) => ({ ...c, scene: s.scenes.find((x) => x._old === c.scene)?.scene ?? c.scene }));
    const issues = problems(s, ids);
    if (!issues.length) break;
    log(`   🔁 Ssenariy qoidalarga mos emas (${attempt}/3): ${issues.slice(0, 5).join('; ')}`);
    if (attempt === 3) {
      if (issues.some((i) => i.includes('mavjud bo\'lmagan') || i.includes('juda kam'))) throw new Error(issues.join('; '));
      log('   ⚠️  Kichik kamchiliklar bilan davom etaman');
      break;
    }
    feedback = `\n\nYOUR PREVIOUS ATTEMPT BROKE THESE RULES — fix them: ${issues.join('; ')}`;
  }

  const scenes = s.scenes.map((x) => ({
    scene: x.scene, narration: String(x.narration).trim(), visual: String(x.visual).trim(),
    useCharacter: x.useCharacter !== false, facts: x.facts || [],
  }));
  const chapters = s.chapters
    .filter((c) => scenes.some((x) => x.scene === c.scene))
    .map((c) => ({ scene: c.scene, title: String(c.title).trim().slice(0, 60) }))
    .sort((a, b) => a.scene - b.scene);
  const onScreenHook = String(s.onScreenHook || '').trim().split(/\s+/).slice(0, 5).join(' ') || research.topic;
  const words = scenes.map((x) => x.narration).join(' ').split(/\s+/).length;
  log(`   ✅ ${scenes.length} ta sahna, ${words} so'z, ${chapters.length} ta bob`);
  log(`   🎣 Hook: "${scenes[0].narration}"  |  Thumbnail: "${onScreenHook}"`);

  const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
  writeJson(outFile, {
    format: 'long', topic: research.topic, hook: scenes[0].narration, onScreenHook, character: s.character,
    style: STYLE_LONG, seed, chapters, scenes,
  });
}

function mockLong(research, count) {
  log('✍️  [MOCK] Uzun ssenariy');
  const scenes = [{ narration: 'This animal breaks almost every rule of nature.', visual: 'octopus glowing' },
    { narration: `Here are ${count} facts that prove it.`, visual: 'octopus waving' }];
  const chapters = [];
  for (let n = count; n >= 1; n--) {
    chapters.push({ scene: scenes.length + 1, title: `#${n}: Fact number ${n}` });
    scenes.push({ narration: `Number ${n}. ${research.facts[(count - n) % research.facts.length].text}`, visual: `octopus scene ${n}` });
    scenes.push({ narration: 'Imagine if you could do that too.', visual: `octopus amazed ${n}` });
  }
  scenes.push({ narration: 'Subscribe for more facts like these.', visual: 'octopus waving goodbye' });
  return {
    format: 'long', topic: research.topic, hook: scenes[0].narration, onScreenHook: 'OCTOPUS IS ALIEN?!', mock: true,
    character: 'a cute purple cartoon octopus with big eyes', style: STYLE_LONG, chapters,
    scenes: scenes.map((x, i) => ({ scene: i + 1, ...x, useCharacter: true, facts: [] })),
  };
}
