// AGENT 2: Muqova rassomi — qo'shiq kayfiyatiga mos bitta rasm (Cloudflare FLUX).
// Har bir shablon o'z uslubida: 1 pastel-pushti, 2 qorong'i tabiat fotosi, 3 albom muqovasi, 4 neon.
// Bitta video = bitta rasm, shuning uchun Cloudflare bepul limiti kuniga o'nlab qo'shiqqa yetadi.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { ffmpeg } from '../lib/ffmpeg.js';
import { log } from '../lib/log.js';
import { retry } from '../lib/util.js';

const STYLE = {
  1: 'dreamy aesthetic album cover art, soft pastel pink and violet light, gentle glow, cinematic, high detail',
  2: 'dark moody cinematic nature photograph at night, mist, deep shadows, atmospheric, realistic photo, 35mm film look',
  3: 'minimalist moody album cover art, dark background, dramatic rim lighting, high contrast, cinematic',
  4: 'neon synthwave cyberpunk scene, glowing magenta and cyan lights, retro-futuristic, chrome reflections, high detail',
};
const NEG = 'no text, no letters, no words, no logo, no watermark, no signature';

const cfUrl = (m) => `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/ai/run/@cf/black-forest-labs/${m}`;

async function cfImage(prompt, out) {
  if (config.mock) {
    await ffmpeg(['-f', 'lavfi', '-i', 'gradients=s=768x1344:c0=0x3b0764:c1=0xdb2777:d=1', '-frames:v', '1', out]);
    return 'mock';
  }
  const form = new FormData();
  form.append('prompt', prompt.slice(0, 2000));
  form.append('width', '768');
  form.append('height', '1344');
  try {
    const res = await fetch(cfUrl('flux-2-klein-4b'), { method: 'POST', headers: { Authorization: `Bearer ${config.cfToken}` }, body: form, signal: AbortSignal.timeout(60_000) });
    const data = await res.json().catch(() => ({}));
    const b64 = data?.result?.image;
    if (!res.ok || !b64) throw new Error(`klein HTTP ${res.status}: ${data.errors?.[0]?.message || ''}`);
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    return 'klein';
  } catch (err) {
    log(`   ↪️  ${err.message.slice(0, 90)} — zaxira model (schnell)`);
    const res = await fetch(cfUrl('flux-1-schnell'), {
      method: 'POST', headers: { Authorization: `Bearer ${config.cfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6 }), signal: AbortSignal.timeout(60_000),
    });
    const data = await res.json().catch(() => ({}));
    const b64 = data?.result?.image;
    if (!res.ok || !b64) {
      const e = new Error(`Cloudflare rasm xatosi: HTTP ${res.status}: ${data.errors?.[0]?.message || ''}`);
      e.fatal = [400, 401, 403].includes(res.status) || /4006|daily free allocation/i.test(JSON.stringify(data));
      throw e;
    }
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    return 'schnell';
  }
}

export async function runCover(runDir, listen, template) {
  const out = path.join(runDir, 'cover.jpg');
  const prompt = `${listen.coverPrompt}. Mood: ${listen.mood || listen.genre}. ${STYLE[template]}. ${NEG}`;
  log(`🎨 Muqova (shablon ${template})`);
  const tmp = path.join(runDir, 'cover_raw.jpg');
  const model = await retry('Muqova', () => cfImage(prompt, tmp), { tries: 3, waits: [5_000, 15_000] });
  // har qanday o'lchamdan 768x1344 (9:16) ga keltiramiz
  await ffmpeg(['-i', tmp, '-vf', 'scale=768:1344:force_original_aspect_ratio=increase,crop=768:1344', '-q:v', '2', out]);
  fs.rmSync(tmp, { force: true });
  log(`   ✅ cover.jpg [${model}]`);
}
