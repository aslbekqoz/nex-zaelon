import fs from 'node:fs';
import { log } from './log.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Qayta urinish: xato bo'lsa kutib, yana urinadi (1 daq, 3 daq, ...).
export async function retry(name, fn, { tries = 3, waits = [60_000, 180_000] } = {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      log(`⚠️  ${name}: ${i}-urinish xato: ${String(err.message).split('\n')[0].slice(0, 200)}`);
      if (i === tries || err.fatal) throw err; // fatal = qayta urinish befoyda (masalan, noto'g'ri so'rov)
      const wait = waits[Math.min(i - 1, waits.length - 1)];
      log(`   ${Math.round(wait / 1000)} soniyadan keyin qayta urinaman...`);
      await sleep(wait);
    }
  }
}

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
export const exists = (file) => fs.existsSync(file) && fs.statSync(file).size > 0;

export function slugify(text) {
  return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

// fetch + aniq xato xabari
export async function fetchJson(url, options = {}, tries = 3) {
  let res;
  for (let i = 1; ; i++) {
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(30_000), ...options });
      break;
    } catch (err) {
      if (i >= tries) throw new Error(`tarmoq xatosi: ${new URL(url).host} (${err.cause?.code || err.message})`);
      await sleep(3000 * i); // internet bir zum uzilsa — qisqa kutib qayta
    }
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url.split('?')[0]}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}
