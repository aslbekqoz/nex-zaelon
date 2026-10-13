// Gemini bilan gaplashish. Javobni har doim JSON ko'rinishida so'raymiz,
// shunda keyingi agent uni aniq o'qiy oladi.
//
// Strategiya ("aylanma"): bitta band modelni kutib o'tirmaymiz —
//   1) hamma modellarni birma-bir sinaymiz (oxirgi ishlagan model birinchi)
//   2) hammasi band bo'lsa — biroz kutib, yana bir aylana
//   3) ishlamaydigan model (404 va h.k.) bu ishga tushishda qayta sinalmaydi
import { config } from '../config.js';
import { log } from './log.js';
import { sleep } from './util.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ROUND_WAITS = [0, 10_000, 30_000, 60_000]; // aylanalar orasidagi kutish

let lastGood = null; // oxirgi muvaffaqiyatli model — keyingi so'rovda birinchi sinaladi
const dead = new Set(); // umuman ishlamaydigan modellar

class GeminiError extends Error {
  constructor(message, retryable) { super(message); this.retryable = retryable; }
}

async function callModel(model, { system, prompt, temperature, images = [] }) {
  // images: [{ label, b64, mime? }] — rasm yoki audio (mime: 'audio/mpeg'). Har biri oldidan nomi yoziladi
  const parts = [{ text: prompt }, ...images.flatMap((im) => [{ text: `\n${im.label}:` }, { inline_data: { mime_type: im.mime || 'image/jpeg', data: im.b64 } }])];
  let res;
  try {
    res = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(images.length ? 240_000 : 120_000),
    });
  } catch (err) {
    throw new GeminiError(`tarmoq xatosi (${err.cause?.code || err.name})`, true);
  }
  const body = await res.text();
  if (!res.ok) {
    let msg = body.slice(0, 120);
    try { msg = JSON.parse(body).error.message; } catch { /* matn qoladi */ }
    const busy = [429, 500, 502, 503, 504].includes(res.status);
    throw new GeminiError(`HTTP ${res.status}${busy ? ' — band' : ''}: ${msg.split('.')[0].slice(0, 80)}`, busy);
  }
  const data = JSON.parse(body);
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new GeminiError('bo\'sh javob', true);
  return parseJsonLoose(text);
}

function order() {
  const list = config.geminiModels.filter((m) => !dead.has(m));
  return lastGood && list.includes(lastGood) ? [lastGood, ...list.filter((m) => m !== lastGood)] : list;
}

// accept(result): ixtiyoriy tekshiruv — javob yaroqsiz bo'lsa (masalan lirika bo'sh), keyingi model sinaladi
export async function askJson({ system, prompt, temperature = 0.7, images = [], accept = null }) {
  if (!config.geminiKey) throw new Error('GEMINI_API_KEY .env faylida yo\'q');
  let lastErr;
  for (const [round, wait] of ROUND_WAITS.entries()) {
    if (wait) {
      log(`   ⏳ Hamma modellar band — ${wait / 1000} soniya kutib, yana sinayman (${round + 1}/${ROUND_WAITS.length})`);
      await sleep(wait);
    }
    const models = order();
    if (!models.length) break;
    for (const model of models) {
      try {
        const result = await callModel(model, { system, prompt, temperature, images });
        if (accept) {
          const why = accept(result);
          if (why !== true) throw new GeminiError(`yaroqsiz javob (${why || 'tekshiruvdan o\'tmadi'})`, true);
        }
        if (model !== lastGood) log(`   🤖 Gemini: ${model}`);
        lastGood = model;
        return result;
      } catch (err) {
        lastErr = err;
        if (!err.retryable) dead.add(model);
        log(`   ↪️  ${model}: ${err.message}`);
      }
    }
  }
  throw new Error(`Gemini javob bermadi: ${lastErr?.message || 'model yo\'q'}`);
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/[\[{][\s\S]*[\]}]/);
    if (m) return JSON.parse(m[0]);
    throw new GeminiError('Gemini JSON qaytarmadi', true);
  }
}
