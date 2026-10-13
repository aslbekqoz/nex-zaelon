// 4-AGENT (1-qism): YouTube uchun sarlavha, tavsif va teglar.
// Natija: metadata.json
import path from 'node:path';
import { config } from '../config.js';
import { askJson } from '../lib/gemini.js';
import { log } from '../lib/log.js';
import { readJson, writeJson } from '../lib/util.js';

export async function runMetadata(runDir, outFile) {
  const script = readJson(path.join(runDir, 'script.json'));
  const research = readJson(path.join(runDir, 'research.json'));
  const narration = script.scenes.map((s) => s.narration).join(' ');
  const long = script.format === 'long';

  let m;
  if (config.mock) {
    log('📝 [MOCK] Metadata');
    m = { title: `Did You Know This About ${research.topic}?`, description: narration, tags: [research.topic, 'facts', 'did you know'] };
  } else {
    log('📝 Sarlavha va tavsif yozyapman');
    m = await askJson({
      temperature: 0.7,
      system: `You write YouTube ${long ? 'long-form video' : 'Shorts'} metadata for a "Did you know?" facts channel. Honest, no clickbait lies.`,
      prompt:
        `Topic: ${research.topic}\nNarration: ${narration.slice(0, 6000)}\n\n` +
        (long ? 'This is a ~7 minute "Top 10" countdown video. Title: curiosity-driven, max 70 characters, include the topic, ' +
          'e.g. "10 Octopus Facts That Sound Fake (But Are True)". Description: 3-4 engaging lines.\n' : '') +
        'Return JSON {"title":"...","description":"...","tags":["..."]}.\n' +
        '- title: max 80 characters, curiosity-driven, must match the video content\n' +
        '- description: 2-3 short lines summarizing the video, then 3-5 relevant hashtags\n' +
        '- tags: 8-12 short tags',
    });
  }

  // Manbalarni har doim tavsif oxiriga qo'shamiz (ishonch uchun)
  const sources = [...new Set(research.facts.map((f) => f.source))];
  let title = String(m.title).replace(/#shorts/gi, '').trim();
  if (title.length > 90) title = title.slice(0, 87) + '...';
  if (!long) title = `${title} #Shorts`;

  // Uzun video: YouTube "chapters" — tavsifdagi vaqt belgilari (0:00 dan boshlanishi shart)
  let chapters = '';
  if (long) {
    const timeline = readJson(path.join(runDir, 'timeline.json'));
    const ts = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    const rows = [{ t: 0, title: 'Intro' }];
    for (const c of script.chapters || []) {
      const seg = timeline.find((x) => x.scene === c.scene);
      if (seg && seg.start - rows[rows.length - 1].t >= 10) rows.push({ t: seg.start, title: c.title });
    }
    if (rows.length >= 3) chapters = `\n\n⏱️ Chapters:\n${rows.map((x) => `${ts(x.t)} ${x.title}`).join('\n')}`;
  }
  const cta = long ? '🔔 Subscribe for new mind-blowing facts every week!' : '🔔 Follow for a new mind-blowing fact every day!';
  const tagsLine = long ? `#DidYouKnow #Facts #${research.topic.replace(/[^A-Za-z0-9]/g, '')}` : '#Shorts #DidYouKnow #Facts';
  const description = `${String(m.description).trim()}${chapters}\n\n${cta}\n\nSources:\n${sources.map((s) => `• ${s}`).join('\n')}\n\n${tagsLine}`;
  const tags = (m.tags || []).map(String).filter((t) => t.length < 30).slice(0, 15);

  writeJson(outFile, { title, description: description.slice(0, 4900), tags, categoryId: config.ytCategoryId });
  log(`   ✅ Sarlavha: ${title}`);
}
