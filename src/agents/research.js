// 2-AGENT: Tadqiqotchi
// Vazifa: mavzu bo'yicha ishonchli manbadan (Wikipedia) faktlar topish,
// har bir faktni manbadagi aniq jumla bilan TEKSHIRISH va eng qiziqlarini saralash.
// Natija: research.json
import { config } from '../config.js';
import { askJson } from '../lib/gemini.js';
import { log } from '../lib/log.js';
import { fetchJson, writeJson } from '../lib/util.js';

const WIKI = 'https://en.wikipedia.org/w/api.php';
const UA = { 'User-Agent': 'youtube-agent/1.0 (personal educational project)' };

async function wikiSearch(topic) {
  const url = `${WIKI}?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(topic)}`;
  const data = await fetchJson(url, { headers: UA });
  return data.query.search.map((s) => s.title).filter((t) => !/disambiguation/i.test(t));
}

// Bitta maqolani oladi. Ma'nolar ro'yxati (disambiguation) sahifasi bo'lsa — null.
async function wikiPage(title) {
  const url = `${WIKI}?action=query&prop=extracts|pageprops&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
  const data = await fetchJson(url, { headers: UA });
  const page = Object.values(data.query.pages)[0];
  if (!page || page.missing !== undefined || page.pageprops?.disambiguation !== undefined) return null;
  const text = (page.extract || '').split(/\n== (See also|References|Further reading|External links) ==/)[0];
  if (text.length < 1500) return null;
  return {
    title: page.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    text: text.slice(0, 30000),
  };
}

// Faqat BITTA asosiy maqola: "Sloth" uchun "Sloth bear" (ayiq!) kabi boshqa narsalar aralashmasin.
async function mainArticle(topic) {
  const exact = await wikiPage(topic);
  if (exact) return exact;
  for (const t of await wikiSearch(topic)) {
    const p = await wikiPage(t);
    if (p) return p;
  }
  return null;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// extract: Gemini nechta fakt topsin, keep: eng qiziqlaridan nechtasi qolsin (uzun video uchun ko'proq)
export async function runResearch(topic, outFile, { extract = 12, keep = 8, min = 4 } = {}) {
  if (config.mock) return writeJson(outFile, mockResearch(topic));

  log(`🔎 Tadqiqot: "${topic}" bo'yicha Wikipedia'dan qidiryapman`);
  const main = await mainArticle(topic);
  if (!main) throw new Error(`Wikipedia'da "${topic}" bo'yicha maqola topilmadi`);
  const sources = [{ id: 'S1', ...main }];
  log(`   Manbalar: ${sources.map((s) => s.title).join(', ')}`);

  const result = await askJson({
    temperature: 0.3,
    system:
      'You are a careful fact researcher for a "Did you know?" YouTube Shorts channel. ' +
      'You ONLY use facts that are written in the provided source texts. Never add outside knowledge.',
    prompt:
      `Topic: ${topic}\n\nFrom the sources below, extract ${extract} surprising, easy-to-understand facts (all different from each other).\n` +
      'For each fact return:\n' +
      '- "text": the fact rewritten in one short, simple English sentence\n' +
      '- "quote": the EXACT sentence copied word-for-word from the source that proves it\n' +
      '- "source": the source id (e.g. "S1")\n' +
      '- "wow": 1-10, how surprising it is to an ordinary person\n' +
      'Return JSON: {"facts":[...]}\n\n' +
      sources.map((s) => `=== ${s.id}: ${s.title} ===\n${s.text}`).join('\n\n'),
  });

  // TEKSHIRISH: AI keltirgan "quote" haqiqatan manbada bormi? Yo'q bo'lsa -> tashlab yuboramiz.
  const verified = [];
  for (const f of result.facts || []) {
    const src = sources.find((s) => s.id === f.source);
    const ok = src && f.quote && norm(src.text).includes(norm(f.quote));
    if (ok && verified.some((v) => norm(v.quote) === norm(f.quote))) continue; // takror fakt
    if (ok) verified.push({ text: f.text, quote: f.quote, wow: Number(f.wow) || 5, source: src.url, sourceTitle: src.title });
    else log(`   ❌ Tasdiqlanmadi, tashlandi: ${f.text}`);
  }
  verified.sort((a, b) => b.wow - a.wow);
  const facts = verified.slice(0, keep).map((f, i) => ({ id: i + 1, ...f }));
  log(`   ✅ ${result.facts?.length || 0} ta faktdan ${verified.length} tasi tasdiqlandi, ${facts.length} tasi tanlandi`);
  if (facts.length < min) throw new Error(`Tasdiqlangan faktlar juda kam (${min} tadan kam)`);

  writeJson(outFile, { topic, createdAt: new Date().toISOString(), sources: sources.map(({ text, ...s }) => s), facts });
}

function mockResearch(topic) {
  log(`🔎 [MOCK] Tadqiqot: ${topic}`);
  return {
    topic,
    mock: true,
    sources: [{ id: 'S1', title: 'Octopus', url: 'https://en.wikipedia.org/wiki/Octopus' }],
    facts: [
      { id: 1, text: 'Octopuses have three hearts.', wow: 9, source: 'https://en.wikipedia.org/wiki/Octopus' },
      { id: 2, text: 'Their blood is blue because of a copper-rich protein.', wow: 8, source: 'https://en.wikipedia.org/wiki/Octopus' },
      { id: 3, text: 'Most of their neurons are in their arms.', wow: 9, source: 'https://en.wikipedia.org/wiki/Octopus' },
      { id: 4, text: 'They can change colour in a fraction of a second.', wow: 7, source: 'https://en.wikipedia.org/wiki/Octopus' },
      { id: 5, text: 'Some octopuses use coconut shells as shelters.', wow: 8, source: 'https://en.wikipedia.org/wiki/Octopus' },
    ],
  };
}
