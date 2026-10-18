// Kadrlarni brauzerda chizib, ffmpeg'ga uzatish + ovozni tahlil qilish (sahna musiqaga "nafas olsin").
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

// ---------- Ovoz tahlili: har kadr uchun level, bass va 24 ta chastota polosasi ----------
function pcm(file, sr) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-']);
    const chunks = [];
    p.stdout.on('data', (d) => chunks.push(d));
    p.on('error', reject);
    p.on('close', (c) => {
      if (c !== 0) return reject(new Error('ffmpeg pcm xato'));
      const b = Buffer.concat(chunks);
      resolve(new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4)));
    });
  });
}

function fft(re, im) { // joyida radix-2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

export async function analyzeAudio(file, fps, frames, nBands = 24) {
  const sr = 22050, N = 2048;
  const s = await pcm(file, sr);
  const win = Float32Array.from({ length: N }, (_, k) => 0.5 - 0.5 * Math.cos((2 * Math.PI * k) / (N - 1)));
  const edges = Array.from({ length: nBands + 1 }, (_, b) => 50 * Math.pow(10000 / 50, b / nBands));
  const bin = (f) => Math.min(N / 2 - 1, Math.max(1, Math.round((f * N) / sr)));
  const raw = { level: [], bass: [], bands: [] };
  for (let i = 0; i < frames; i++) {
    const c = Math.floor((i / fps) * sr);
    const re = new Float64Array(N), im = new Float64Array(N);
    let rms = 0;
    for (let k = 0; k < N; k++) { const v = s[c - N / 2 + k] || 0; re[k] = v * win[k]; rms += v * v; }
    fft(re, im);
    const mag = (k) => Math.hypot(re[k], im[k]);
    const bands = [];
    for (let b = 0; b < nBands; b++) {
      let sum = 0, cnt = 0;
      for (let k = bin(edges[b]); k <= Math.max(bin(edges[b]), bin(edges[b + 1]) - 1); k++) { sum += mag(k); cnt++; }
      bands.push(20 * Math.log10(sum / cnt + 1e-6));
    }
    let lo = 0;
    for (let k = bin(30); k <= bin(150); k++) lo += mag(k);
    raw.level.push(10 * Math.log10(rms / N + 1e-9));
    raw.bass.push(20 * Math.log10(lo + 1e-6));
    raw.bands.push(bands);
  }
  // 0..1 ga keltirish (5–98 persentil) va silliqlash (tez ko'tarilib, sekin tushadi)
  const norm = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.05)] ?? 0, hi = sorted[Math.floor(sorted.length * 0.98)] ?? 1;
    return arr.map((v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1))));
  };
  const smooth = (arr, up = 0.6, down = 0.12) => { let p = 0; return arr.map((v) => (p += (v - p) * (v > p ? up : down))); };
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const level = smooth(norm(raw.level)).map(r3);
  const bass = smooth(norm(raw.bass), 0.7, 0.15).map(r3);
  const cols = Array.from({ length: nBands }, (_, b) => smooth(norm(raw.bands.map((x) => x[b])), 0.55, 0.14));
  const bands = Array.from({ length: frames }, (_, i) => cols.map((col) => r3(col[i])));
  return { level, bass, bands };
}

// ---------- Kadrlarni chizish ----------
// html: to'liq sahifa; har kadrda window.frame(t, i) chaqiriladi va JPEG surat ffmpeg'ga uzatiladi.
export async function renderFrames({ html, workDir, fps, frames, audio, out, post = '', onProgress }) {
  const htmlFile = path.join(workDir, 'scene.html');
  fs.writeFileSync(htmlFile, html);
  const browser = await chromium.launch({
    executablePath: process.env.NEX_CHROME || undefined,
    args: ['--disable-web-security', '--allow-file-access-from-files', '--force-color-profile=srgb', '--hide-scrollbars'],
  });
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', audio, '-filter_complex', `[0:v]${post ? post + ',' : ''}format=yuv420p[v]`, '-map', '[v]', '-map', '1:a',
    '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', '16M', '-bufsize', '32M', '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', (d) => (ffErr += d));
  const ffDone = new Promise((resolve, reject) => ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg: ' + ffErr.slice(-400))))));
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto('file://' + htmlFile);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((im) => im.complete));
    for (let i = 0; i < frames; i++) {
      await page.evaluate(([t, k]) => window.frame(t, k), [i / fps, i]);
      const jpg = await page.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
      if (onProgress && i % (fps * 5) === 0) onProgress(i, frames);
    }
  } finally {
    ff.stdin.end();
    await browser.close();
  }
  await ffDone;
}
